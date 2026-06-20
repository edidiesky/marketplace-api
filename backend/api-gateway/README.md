# api-gateway

Single entry point for all client traffic. Handles JWT authentication, dynamic rule-based rate limiting, subdomain-to-store context resolution, per-service circuit breaking, and HTTP proxying to downstream services. Owns the rate limit rules CRUD and the rules engine that enforces them.

## Key facts

| Property       | Value                                          |
|----------------|------------------------------------------------|
| Port           | 8000                                           |
| Container      | `selleazy_api_gateway`                         |
| Database       | MongoDB (`SELLEASI_RULES_API` database)        |
| Cache          | Redis (rate limit counters, subdomain cache, JWT blocklist) |
| Broker         | None (no RabbitMQ connection)                  |
| Env files      | `.env` (root) + `backend/api-gateway/.env`     |

## Inbound traffic

**Public (no JWT required):**
Any request whose first path segment matches a key in `PUBLIC_ROUTES`: currently only `auth`. Full path: `/:service/*` where `service === "auth"`.

Webhook path `payment/api/v1/webhooks/*` is also unauthenticated and rate-limit-exempt.

**Authenticated:**
All other `/:service/*` requests. JWT verified via `authenticate` middleware before proxying.

`/api/v1/rules/*` requires a valid JWT. No role or permission check beyond that (any authenticated user).

**No internal routes.** The gateway does not expose an internal-secret-gated path. It consumes `INTERNAL_SECRET` only when calling the stores service for subdomain resolution.

## Outbound HTTP

| Destination          | Trigger                              | Auth header sent          |
|----------------------|--------------------------------------|---------------------------|
| `stores:4007`        | Subdomain detected on inbound `Host` | `x-internal-secret`       |
| Any downstream service | All proxied requests               | `x-user-id`, `x-user-type`, `x-organization-id`, `x-store-id`, `x-store-organization-id`, `x-store-name` (when applicable) |

Proxying uses Axios with 8 s timeout per request. Each downstream service has a dedicated circuit breaker (opossum): opens at 50% error rate over a minimum of 5 requests, resets after 30 s.

## Service routing table

| Path prefix  | Downstream URL env var            | Default target              |
|--------------|-----------------------------------|-----------------------------|
| `/auth/*`    | `AUTH_SERVICE_URL`                | `http://authentication:4001` |
| `/audit/*`   | `AUDIT_SERVICE_URL`               | `http://audit:4002`         |
| `/products/*`| `PRODUCTS_SERVICE_URL`            | `http://products:4003`      |
| `/payment/*` | `PAYMENT_SERVICE_URL`             | `http://payment:4004`       |
| `/categories/*` | `CATEGORIES_SERVICE_URL`       | `http://categories:4005`    |
| `/notification/*` | `NOTIFICATION_SERVICE_URL`   | `http://notification:4006`  |
| `/stores/*`  | `STORES_SERVICE_URL`              | `http://stores:4007`        |
| `/inventory/*` | `INVENTORY_SERVICE_URL`         | `http://inventory:4008`     |
| `/cart/*`    | `CART_SERVICE_URL`                | `http://cart:4009`          |
| `/organization/*` | `ORGANIZATION_SERVICE_URL`   | `http://organization:4010`  |
| `/review/*`  | `REVIEW_SERVICE_URL`              | `http://review:4011`        |
| `/orders/*`  | `ORDERS_SERVICE_URL`              | `http://orders:4012`        |
| `/color/*`   | `COLOR_SERVICE_URL`               | `http://color:4013`         |
| `/view/*`    | `VIEW_SERVICE_URL`                | `http://view:4014`          |
| `/size/*`    | `SIZE_SERVICE_URL`                | `http://size:4015`          |
| `/users/*`   | `USERS_SERVICE_URL`               | `http://users:4016`         |
| `/subscription/*` | `SUBSCRIPTION_SERVICE_URL`   | `http://subscription:4017`  |
| `/escrow/*`  | `ESCROW_SERVICE_URL`              | `http://escrow:4018`        |

Services with no running container (categories, color, view, size, escrow) will return 503 (circuit breaker) on first requests.

## API route table

| Prefix             | Route file                        | Note                                    |
|--------------------|-----------------------------------|-----------------------------------------|
| `/api/v1/rules`    | `src/routes/rules.routes.ts`      | Rate limit rule CRUD. JWT required.     |
| `/:service/*`      | `src/app.ts` (inline handler)     | Proxy to downstream services            |
| `/health`          | `src/app.ts`                      | Shallow liveness check                  |
| `/metrics`         | `src/app.ts`                      | Prometheus. No auth guard.              |
| `/api-docs`        | `src/app.ts`                      | Swagger UI (aggregates all service specs) |
| `/api-docs/swagger.json` | `src/app.ts`                | Aggregated OpenAPI spec. Cached 60 s.   |

See [API Contracts](./API_CONTRACTS.md) for full request/response shapes.

## Rate limiting

Two algorithms available, selected per rule:
- **Token bucket** (default): capacity and refill rate configurable per rule.
- **Sliding window log**: used by default for `/auth/*` routes.

Default fallback rule when no DB rule matches: 10 requests per 60 s, token bucket for non-auth routes, sliding window for `/auth/*`.

Rules are loaded from MongoDB at startup and refreshed every 60 s. Live rule updates (via CRUD API) are propagated to all gateway instances via Redis PubSub on channel `gateway:rules:sync`.

Rate limiting is skipped for: webhook paths, `/health`, `/metrics`, and any request when Redis is unavailable (fail open).

Rate limit key: `rl:gateway:<userId>:<ruleId>` for authenticated requests, `rl:gateway:<ip>:<ruleId>` for unauthenticated.

## Environment variables

| Variable                  | Purpose                                                   | Notes                                                        |
|---------------------------|-----------------------------------------------------------|--------------------------------------------------------------|
| `DATABASE_URL`            | MongoDB connection string                                 | Required. Crashes on missing.                                |
| `IO_REDIS_URL`            | ioredis connection URL                                    | Required. Crashes on missing. Root `.env` provides this. Service `.env` sets `REDIS_URL` (different name) which is never read. |
| `JWT_CODE`                | JWT verification secret                                   | Required. Crashes on missing.                                |
| `WEB_ORIGIN`              | Allowed CORS origin                                       | Required. Crashes on missing.                                |
| `BASE_DOMAIN`             | Platform root domain for subdomain extraction             | Required. Crashes on missing. Also has `?? "selleasi.com"` fallback in constants. |
| `INTERNAL_SECRET`         | Sent to stores service for subdomain resolution           | Defaults to `""` if unset - subdomain calls will succeed structurally but stores service may reject them. |
| `PORT`                    | HTTP listen port                                          | Defaults to `8000`                                           |
| `NODE_ENV`                | Environment flag                                          | Affects error detail in responses                            |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP trace export URL                               | Defaults to `http://tempo:4318`. Root `.env` sets this. Correctly consumed here (unlike auth service). |
| `OTEL_SERVICE_NAME`       | Service name in traces                                    | Read in error-handler for log enrichment                     |
| `*_SERVICE_URL`           | Per-service downstream URL overrides                      | All default to docker-network hostnames if unset             |
| `RATE_LIMIT_WINDOW_MS`    | Present in service `.env`                                 | Zero usages in `src/`. Dead variable.                        |
| `RATE_LIMIT_MAX_REQUESTS` | Present in service `.env`                                 | Zero usages in `src/`. Dead variable.                        |

## Tests

| Script          | What it runs                        |
|-----------------|-------------------------------------|
| `test`          | Jest unit config                    |
| `test:coverage` | Unit tests with coverage            |
| `test:watch`    | Jest in watch mode                  |

No integration test files found. No `__tests__` directory in the extracted source.

## Operations

| Concern       | Detail                                                                                       |
|---------------|----------------------------------------------------------------------------------------------|
| Health check  | `GET /health` returns `{ status: "ok" }`. Shallow - does not check MongoDB, Redis, or downstream services. |
| Metrics       | `GET /metrics` - Prometheus format. No authentication guard.                                 |
| Rate limiting | Active. DB-backed rules + Redis counters. Fails open on Redis unavailability.               |
| Circuit breaker | Per downstream service. Opossum. Opens at 50% errors / 5 req minimum, resets at 30 s.    |
| Subdomain cache | Redis key `subdomain:<name>`, TTL 300 s.                                                  |
| WP probe blocking | Common WordPress/PHP probe paths return 404 before any middleware runs.                 |