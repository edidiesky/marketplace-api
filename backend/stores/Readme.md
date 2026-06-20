# stores-service

Owns the Store entity: creation, subdomain generation, custom domain management (CNAME verification + Caddy Admin API integration), and store status lifecycle. Exposes a public subdomain resolution endpoint used by the gateway for store context injection on subdomain requests.

## Key facts

| Property       | Value                                          |
|----------------|------------------------------------------------|
| Port           | 4007                                           |
| Container      | `selleazy_stores`                              |
| Database       | MongoDB (`SELLEASI_STORE_API`)                 |
| Cache          | Redis (store by ID cache, TTL 3600 s)          |
| Broker         | RabbitMQ                                       |
| Env files      | `.env` (root) + `backend/stores/.env`          |

## Inbound traffic

**Public (no auth):**
`GET /api/v1/stores/resolve` - resolves store by Host header.
`GET /api/v1/stores/subdomain/:subdomain` - public store lookup by subdomain.
`GET /api/v1/stores/:storeId` - public store detail by MongoDB `_id`.

**Authenticated (JWT required):**
All write operations and owner-scoped reads.

**Internal (`x-internal-secret` required):**
`GET /api/v1/stores/internal/subdomain/:subdomain` - called by the gateway's subdomain resolver. Returns `{ storeId, organizationId, storeName }`.

## Outbound HTTP

| Target | Endpoint | Trigger |
|--------|----------|---------|
| Caddy Admin API (`caddy:2019`) | `POST /config/apps/http/servers/srv0/routes` | Store created - adds subdomain route |
| Caddy Admin API | (route management) | Custom domain added/removed |

## RabbitMQ publishes

| Exchange               | Routing key                              | Trigger                     |
|------------------------|------------------------------------------|-----------------------------|
| `selleasi.stores`      | `store.created`                          | Store created successfully  |
| `selleasi.stores`      | `store.domain.verified`                  | Custom domain verified      |
| `selleasi.notification`| `notification.store.onboarding.completed`| Store created (welcome email)|

**RabbitMQ consumes:** None. `QUEUES` is empty.

## API route table

| Prefix           | Route file                             | Note                              |
|------------------|----------------------------------------|-----------------------------------|
| `/api/v1/stores` | `src/domains/stores/store.routes.ts`   | All store endpoints               |
| `/health`        | `src/app.ts`                           | Shallow                           |
| `/metrics`       | `src/app.ts`                           | Prometheus. No auth guard.        |

See [API Contracts](./API_CONTRACTS.md).

## Environment variables

| Variable            | Purpose                                   | Notes                                         |
|---------------------|-------------------------------------------|-----------------------------------------------|
| `DATABASE_URL`      | MongoDB connection string                 | Required.                                     |
| `REDIS_HOST/PORT/PASSWORD` | Redis connection                   | Required in practice.                         |
| `JWT_CODE`          | JWT verification secret                   | Required.                                     |
| `RABBITMQ_URL`      | AMQP connection string                    | Required.                                     |
| `WEB_ORIGIN`        | CORS origin                               | Required.                                     |
| `INTERNAL_SECRET`   | Guards `/internal/*` endpoint             | Required.                                     |
| `CADDY_ADMIN_URL`   | Caddy Admin API base URL                  | Set to `http://caddy:2019` in service `.env`  |
| `CADDY_BASE_DOMAIN` | Base domain for subdomain route generation | Set to `selleasi.com` in service `.env`       |
| `PORT`              | Listen port                               | Defaults to `4007`                            |
| `OTEL_SERVICE_NAME` | Trace/log service tag                     | Set to `"stores-service"` in `.env`           |
| `FRONTEND_UPSTREAM` | Present in service `.env`                 | Used in Caddy service for frontend routing.   |
| `BATCH_SIZE`        | Present in `.env`                         | Zero usages in `src/`. Dead.                  |
| `HOST`              | Present in `.env` as `0.0.0.0`            | Not used in `server.ts`. Dead.                |

## Tests

| Script | What it runs |
|--------|--------------|
| `test` | Jest unit config |

**Phase 4:** `store.test.ts` (integration) and `store.service.test.ts` (unit) exist.

## Operations

| Concern          | Detail                                                                              |
|------------------|-------------------------------------------------------------------------------------|
| Health check     | `GET /health` - shallow.                                                            |
| Metrics          | `GET /metrics` - no auth guard.                                                     |
| Subdomain cache  | Redis `store:subdomain:<subdomain>`, TTL 3600 s. Busted on store update.           |
| Caddy integration | Caddy Admin API called on store creation and domain changes. Phase 2 dependency.  |
| Domain verification | CNAME check via DNS lookup (`domain-verification.service.ts`).                  |