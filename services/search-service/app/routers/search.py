"""Search router — handles full-text, filter, and geo-radius property queries."""

import json
import hashlib
from typing import Optional

import asyncpg
from fastapi import APIRouter, Query, Request, HTTPException

from app.core.config import settings
from app.models.schemas import SearchResponse, PropertySummary

router = APIRouter()

CACHE_TTL_SECONDS = 60


def _cache_key(params: dict) -> str:
    """Derives a deterministic Redis cache key from query parameters."""
    raw = json.dumps(params, sort_keys=True)
    return f"search:{hashlib.md5(raw.encode()).hexdigest()}"


async def _get_db_conn(request: Request) -> asyncpg.Connection:
    """Opens a single-use asyncpg connection from the DATABASE_URL."""
    return await asyncpg.connect(settings.DATABASE_URL)


@router.get("", response_model=SearchResponse, summary="Search properties with filters")
async def search_properties(
    request: Request,
    q: Optional[str]   = Query(None,  description="Full-text search query"),
    type: Optional[str] = Query(None, description="'sale' or 'rent'"),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_area:  Optional[float] = Query(None, ge=0),
    max_area:  Optional[float] = Query(None, ge=0),
    bedrooms:  Optional[int]   = Query(None, ge=0),
    city:      Optional[str]   = Query(None),
    lat:       Optional[float] = Query(None, ge=-90,  le=90),
    lng:       Optional[float] = Query(None, ge=-180, le=180),
    radius_km: Optional[float] = Query(None, ge=0.1, le=200, description="Geo-radius in km"),
    page:      int             = Query(1,    ge=1),
    limit:     int             = Query(20,   ge=1, le=100),
):
    """
    Searches properties with optional full-text, field filters, and geo-radius.
    Results are cached in Redis for 60 seconds.
    """
    params = {k: v for k, v in locals().items() if k not in ("request",) and v is not None}
    cache_key = _cache_key(params)

    # Try cache first
    redis = request.app.state.redis
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    # Build dynamic query
    conditions = ["p.status = 'available'"]
    args: list = []
    idx = 1

    if q:
        conditions.append(
            f"(to_tsvector('english', p.title || ' ' || p.description || ' ' || p.city) "
            f"@@ plainto_tsquery('english', ${idx}))"
        )
        args.append(q); idx += 1

    if type:
        conditions.append(f"p.type = ${idx}"); args.append(type); idx += 1
    if min_price is not None:
        conditions.append(f"p.price >= ${idx}"); args.append(min_price); idx += 1
    if max_price is not None:
        conditions.append(f"p.price <= ${idx}"); args.append(max_price); idx += 1
    if min_area is not None:
        conditions.append(f"p.area >= ${idx}"); args.append(min_area); idx += 1
    if max_area is not None:
        conditions.append(f"p.area <= ${idx}"); args.append(max_area); idx += 1
    if bedrooms is not None:
        conditions.append(f"p.bedrooms = ${idx}"); args.append(bedrooms); idx += 1
    if city:
        conditions.append(f"p.city ILIKE ${idx}"); args.append(f"%{city}%"); idx += 1

    # Haversine geo-radius filter (PostgreSQL)
    if lat is not None and lng is not None and radius_km is not None:
        conditions.append(
            f"(6371 * acos(cos(radians(${idx})) * cos(radians(p.lat)) * "
            f"cos(radians(p.lng) - radians(${idx+1})) + sin(radians(${idx})) * sin(radians(p.lat)))) <= ${idx+2}"
        )
        args += [lat, lng, radius_km]; idx += 3

    where_clause = " AND ".join(conditions)
    offset = (page - 1) * limit

    count_sql = f"""
        SELECT COUNT(*) FROM properties p WHERE {where_clause}
    """
    data_sql = f"""
        SELECT
            p.id, p.title, p.price, p.type, p.status,
            p.bedrooms, p.bathrooms, p.area, p.address, p.city, p.lat, p.lng,
            p.created_at,
            (SELECT i.url FROM images i WHERE i.property_id = p.id ORDER BY i.created_at LIMIT 1) AS cover_image
        FROM properties p
        WHERE {where_clause}
        ORDER BY p.created_at DESC
        LIMIT {limit} OFFSET {offset}
    """

    conn = await _get_db_conn(request)
    try:
        total    = await conn.fetchval(count_sql, *args)
        rows     = await conn.fetch(data_sql, *args)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Database query failed") from exc
    finally:
        await conn.close()

    properties = [
        PropertySummary(
            id=str(r["id"]),
            title=r["title"],
            price=float(r["price"]),
            type=r["type"],
            status=r["status"],
            bedrooms=r["bedrooms"],
            bathrooms=r["bathrooms"],
            area=float(r["area"]),
            address=r["address"],
            city=r["city"],
            lat=float(r["lat"]),
            lng=float(r["lng"]),
            cover_image=r["cover_image"],
            created_at=r["created_at"].isoformat() if r["created_at"] else None,
        )
        for r in rows
    ]

    result = SearchResponse(
        data=properties,
        total=total,
        page=page,
        total_pages=(total + limit - 1) // limit,
    )

    await redis.set(cache_key, result.model_dump_json(), ex=CACHE_TTL_SECONDS)
    return result


@router.get("/suggest", summary="Autocomplete city and title suggestions")
async def suggest(
    request: Request,
    q: str = Query(..., min_length=2, description="Partial search term"),
):
    """Returns up to 10 city and title suggestions matching the query prefix."""
    conn = await _get_db_conn(request)
    try:
        rows = await conn.fetch(
            """
            SELECT DISTINCT city AS suggestion, 'city' AS kind FROM properties
            WHERE city ILIKE $1 AND status = 'available'
            UNION ALL
            SELECT DISTINCT title, 'property' FROM properties
            WHERE title ILIKE $1 AND status = 'available'
            LIMIT 10
            """,
            f"{q}%",
        )
    finally:
        await conn.close()

    return {"data": [{"suggestion": r["suggestion"], "kind": r["kind"]} for r in rows]}


@router.get("/filters", summary="Available filter option counts")
async def get_filters(request: Request):
    """Returns distinct cities, price range, and bedroom counts for the filter UI."""
    conn = await _get_db_conn(request)
    try:
        cities    = await conn.fetch("SELECT DISTINCT city FROM properties WHERE status='available' ORDER BY city")
        price_agg = await conn.fetchrow("SELECT MIN(price) AS min, MAX(price) AS max FROM properties WHERE status='available'")
        bedrooms  = await conn.fetch("SELECT DISTINCT bedrooms FROM properties WHERE status='available' ORDER BY bedrooms")
    finally:
        await conn.close()

    return {
        "cities":   [r["city"] for r in cities],
        "price":    {"min": price_agg["min"], "max": price_agg["max"]},
        "bedrooms": [r["bedrooms"] for r in bedrooms],
    }
