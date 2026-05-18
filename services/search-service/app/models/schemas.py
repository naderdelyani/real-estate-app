"""Pydantic models for the search service API."""

from typing import Optional, List
from pydantic import BaseModel, Field


class PropertySummary(BaseModel):
    """Compact property representation returned in search results."""

    id:          str
    title:       str
    price:       float
    type:        str
    status:      str
    bedrooms:    int
    bathrooms:   int
    area:        float
    address:     str
    city:        str
    lat:         float
    lng:         float
    cover_image: Optional[str] = None
    created_at:  Optional[str] = None


class SearchResponse(BaseModel):
    """Paginated search result envelope."""

    data:        List[PropertySummary] = Field(default_factory=list)
    total:       int
    page:        int
    total_pages: int


class SuggestItem(BaseModel):
    """Single autocomplete suggestion with its source kind."""

    suggestion: str
    kind:       str   # 'city' | 'property'


class SuggestResponse(BaseModel):
    data: List[SuggestItem]
