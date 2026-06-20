# inventory-service

Owns inventory records, stock reservation, release, and commit as a saga participant in the checkout flow. Uses MVCC (optimistic concurrency via document versioning) to handle high-throughput concurrent reservation attempts without row-level locks. Consumes `product.created` to seed inventory records.

## Key facts

| Property       | Value                                                   |
|----------------|---------------------------------------------------------|
| Port           | 4008                                                    |
| Container      | `selleazy_inventory`                                    |
| Database       | MongoDB (`SELLEASI_INVENTORY_API`)                      |
| Cache          | Redis (Redlock for reservation, availability cache)     |
| Broker         | RabbitMQ                                                |
| Env files      | `.env` (root) + `backend/inventory/.env`                |

## Inbound traffic

**Public (no auth):**
`GET /api/v1/inventories/check/:productId` - availability check. Unauthenticated.

**Authenticated (JWT required):**
CRUD endpoints for inventory management per store.

**Internal (`x-internal-secret` required):**
`POST /reserve`, `POST /release`, `POST /commit`, `POST /internal/reservations/:sagaId/expire`

## Outbound

**RabbitMQ publishes:**

| Exchange                | Routing key             | Trigger                               |
|-------------------------|-------------------------|---------------------------------------|
| `selleasi.inventory`    | `inventory.reserved`    | Stock successfully reserved           |
| `selleasi.inventory`    | `inventory.released`    | Stock released on payment failure     |
| `selleasi.inventory`    | `inventory.committed`   | Stock committed on payment success    |
| `selleasi.inventory`    | `inventory.low`         | Stock falls below threshold           |

**RabbitMQ consumes:**

| Queue                                      | Routing key       | Handler                               |
|--------------------------------------------|-------------------|---------------------------------------|
| `selleasi.inventory.product.created.queue` | `product.created` | Seeds inventory record for new product |

## API route table

| Prefix                | Route file                                  | Note                       |
|-----------------------|---------------------------------------------|----------------------------|
| `/api/v1/inventories` | `src/domains/inventory/inventory.routes.ts` | All inventory endpoints    |
| `/health`             | `src/app.ts`                                | Shallow                    |
| `/metrics`            | `src/app.ts`                                | Prometheus. No auth guard. |

See [API Contracts](./API_CONTRACTS.md).

## Environment variables

| Variable            | Purpose                       | Notes                                 |
|---------------------|-------------------------------|---------------------------------------|
| `DATABASE_URL`      | MongoDB connection string     | Required.                             |
| `REDIS_HOST/PORT/PASSWORD` | Redis connection        | Required in practice.                 |
| `JWT_CODE`          | JWT verification secret       | Required.                             |
| `RABBITMQ_URL`      | AMQP connection string        | Required.                             |
| `WEB_ORIGIN`        | CORS origin                   | Required.                             |
| `INTERNAL_SECRET`   | Guards internal endpoints     | Required.                             |
| `PORT`              | Listen port                   | Defaults to `4008`                    |
| `OTEL_SERVICE_NAME` | Trace/log service tag         | Set to `inventory-service` in `.env`  |
| `BATCH_SIZE`        | Present in `.env`             | Zero usages in `src/`. Dead.          |

## Tests

| Script             | What it runs        |
|--------------------|---------------------|
| `test`             | Jest unit config    |
| `test:integration` | Integration config  |

**Phase 4:** `inventory.integration.test.ts` and `inventory.repository.test.ts` exist. k6 load results in `_infrastructure/k6/results/` demonstrate MVCC performance improvement.

## Operations

| Concern          | Detail                                                                               |
|------------------|--------------------------------------------------------------------------------------|
| Health check     | `GET /health` - shallow.                                                             |
| Metrics          | `GET /metrics` - no auth guard.                                                      |
| MVCC             | Up to 8 retries, 15 ms base delay + jitter on optimistic concurrency conflicts.      |
| Reservation TTL  | 600 s. Reservations expire if not committed or released.                             |
| Low stock thresh | `LOW_STOCK_THRESHOLD_MULTIPLIER = 1`.                                                |