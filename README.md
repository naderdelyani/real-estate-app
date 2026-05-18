# 🏠 Real Estate App

A production-ready, full-stack real estate platform built with microservices architecture.

[![CI](https://github.com/naderdelyani/real-estate-app/actions/workflows/ci.yml/badge.svg)](https://github.com/naderdelyani/real-estate-app/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                  NGINX Reverse Proxy (:80/:443)                 │
└──────┬──────────────┬──────────────┬─────────────┬────────────┘
       │              │              │             │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼──────┐ ┌───▼──────────┐
│  Frontend   │ │    Auth    │ │ Property  │ │   Search /   │
│ (Next.js 14)│ │  Service   │ │  Service  │ │ Notification │
│  :3000      │ │ (Node.js)  │ │ (Node.js) │ │  (FastAPI)   │
└─────────────┘ │   :4001    │ │   :4002   │ │ :4003/:4004  │
                └─────┬──────┘ └────┬──────┘ └──────────────┘
                      │             │
          ┌───────────┴─────────────┴──────────────┐
          │              Infrastructure              │
          │  PostgreSQL  Redis  RabbitMQ  MinIO     │
          │  :5432       :6379  :5672     :9000     │
          └────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js + TypeScript | 14.x |
| **Styling** | TailwindCSS | 3.x |
| **State Management** | Zustand | 4.x |
| **Forms** | React Hook Form | 7.x |
| **Maps** | Leaflet | 1.x |
| **Auth Service** | Node.js + Express | 20.x |
| **Property Service** | Node.js + Express + Prisma | 20.x |
| **Search Service** | Python + FastAPI | 3.11 |
| **Notification Service** | Python + FastAPI + RabbitMQ | 3.11 |
| **Database** | PostgreSQL | 15 |
| **Cache** | Redis | 7 |
| **Object Storage** | MinIO | Latest |
| **Message Broker** | RabbitMQ | 3.12 |
| **Reverse Proxy** | NGINX | 1.25 |
| **Containerization** | Docker + Compose | Latest |
| **CI/CD** | GitHub Actions | — |

## Quick Start

### Prerequisites

- Docker 24+ and Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)

### 1. Clone and Configure

```bash
git clone https://github.com/naderdelyani/real-estate-app.git
cd real-estate-app
cp .env.example .env
# Edit .env with your values
```

### 2. Start All Services

```bash
docker-compose up -d
```

### 3. Run Database Migrations

```bash
docker-compose exec property-service npx prisma migrate deploy
```

### 4. Access the Application

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **API Gateway** | http://localhost:80 |
| **Auth API** | http://localhost:4001 |
| **Property API** | http://localhost:4002 |
| **Search API** | http://localhost:4003 |
| **Notification API** | http://localhost:4004 |
| **RabbitMQ Management** | http://localhost:15672 |
| **MinIO Console** | http://localhost:9001 |

## API Reference

### Auth Service (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | No | Register a new user |
| `POST` | `/api/auth/login` | No | Login and get JWT tokens |
| `POST` | `/api/auth/refresh` | No | Refresh access token |
| `POST` | `/api/auth/logout` | Yes | Invalidate refresh token |
| `GET` | `/api/auth/me` | Yes | Get current user profile |
| `GET` | `/api/auth/health` | No | Service health check |

### Property Service (`/api/properties`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/properties` | No | List properties (paginated) |
| `GET` | `/api/properties/:id` | No | Get property details |
| `POST` | `/api/properties` | Yes | Create a new property listing |
| `PUT` | `/api/properties/:id` | Yes | Update property |
| `DELETE` | `/api/properties/:id` | Yes | Delete property |
| `POST` | `/api/properties/:id/images` | Yes | Upload property images |
| `DELETE` | `/api/properties/:id/images/:imageId` | Yes | Remove an image |
| `POST` | `/api/properties/:id/favorites` | Yes | Toggle favorite |
| `POST` | `/api/properties/:id/appointments` | Yes | Book a viewing appointment |
| `GET` | `/api/properties/health` | No | Service health check |

### Search Service (`/api/search`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/search` | No | Full-text search with filters |
| `GET` | `/api/search/suggest` | No | Autocomplete suggestions |
| `GET` | `/api/search/filters` | No | Available filter options |
| `GET` | `/api/search/health` | No | Service health check |

#### Search Query Parameters

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Full-text search query |
| `type` | string | `sale` or `rent` |
| `min_price` | number | Minimum price |
| `max_price` | number | Maximum price |
| `min_area` | number | Minimum area (m²) |
| `max_area` | number | Maximum area (m²) |
| `bedrooms` | number | Number of bedrooms |
| `city` | string | City name |
| `lat` | number | Latitude for geo search |
| `lng` | number | Longitude for geo search |
| `radius` | number | Search radius in km |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |

## Project Structure

```
real-estate-app/
├── .github/
│   └── workflows/
│       ├── ci.yml                   # Lint + test on every PR
│       ├── deploy-staging.yml       # Deploy on merge to develop
│       └── deploy-prod.yml          # Deploy on merge to main
├── frontend/                        # Next.js 14 application
│   ├── app/                         # App Router pages
│   │   ├── (public)/properties/     # Property listing & detail
│   │   └── (dashboard)/admin/       # Admin dashboard
│   └── components/                  # Shared UI components
├── services/
│   ├── auth-service/                # JWT authentication (Node.js + Express)
│   ├── property-service/            # Property CRUD (Node.js + Prisma)
│   ├── search-service/              # Search & filters (FastAPI)
│   └── notification-service/        # Email + SMS alerts (FastAPI)
├── infra/
│   ├── nginx/nginx.conf             # Reverse proxy configuration
│   ├── monitoring/prometheus.yml    # Metrics collection
│   └── k8s/                         # Kubernetes manifests (WIP)
├── docker-compose.yml               # Development orchestration
├── docker-compose.prod.yml          # Production orchestration
└── .env.example                     # Environment variables template
```

## Contributing

1. Fork the repository
2. Create a feature branch from `develop`: `git checkout -b feat/your-feature develop`
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`
4. Push your branch and open a PR targeting `develop`
5. PRs to `main` are only accepted from `develop` via release PRs

## License

This project is licensed under the MIT License.
