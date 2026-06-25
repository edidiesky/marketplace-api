# review-service

Owns the Review entity: customer product reviews, seller responses, helpfulness votes, and moderation (approve/reject). The `src.zip` file was labeled `products` but contains the review service at port 4011. There is no products service source available for documentation.

## Key facts

| Property       | Value                                        |
|----------------|----------------------------------------------|
| Port           | 4011                                         |
| Container      | `selleazy_review`                            |
| Database       | MongoDB (`SELLEASI_REVIEW_API`)              |
| Cache          | Redis (idempotency keys for order.completed) |
| Broker         | RabbitMQ                                     |
| Env files      | `.env` (root) + `backend/review/.env`        |

## Inbound traffic

**Public (no auth):**
`GET /api/v1/reviews/product/:productId` - product review listing.

**Authenticated (JWT required):**
All other routes. No RBAC middleware on any route. Approve and reject endpoints require only a valid JWT - any authenticated user can moderate any review.

## Outbound

**RabbitMQ publishes:**

| Exchange           | Routing key        | Trigger                   |
|--------------------|--------------------|---------------------------|
| `selleasi.review`  | `review.created`   | Review submitted          |
| `selleasi.review`  | `review.approved`  | Review approved by moderator |

**RabbitMQ consumes:**

| Queue                                      | Routing key       | Handler                                     |
|--------------------------------------------|-------------------|---------------------------------------------|
| `selleasi.review.order.completed.queue`    | `order.completed` | Logs event, sets idempotency key in Redis. Currently a no-op (no review unlock logic). |

**Outbound HTTP:** None.

## API route table

| Prefix              | Route file                                    | Note                               |
|---------------------|-----------------------------------------------|------------------------------------|
| `/api/v1/reviews`   | `src/domains/review/review.routes.ts`         | All review endpoints               |
| `/health`           | `src/app.ts`                                  | Shallow. Reports as `review-service`. |
| `/metrics`          | `src/app.ts`                                  | Prometheus. No auth guard.         |

See [API Contracts](./API_CONTRACTS.md).

## Environment variables

| Variable            | Purpose                              | Notes                              |
|---------------------|--------------------------------------|------------------------------------|
| `DATABASE_URL`      | MongoDB connection string            | Required. Crashes on missing.      |
| `REDIS_HOST`        | Redis host                           | Defaults to `"redis"`              |
| `REDIS_PORT`        | Redis port                           | Defaults to `6379`                 |
| `REDIS_PASSWORD`    | Redis auth                           | Required in practice.              |
| `JWT_CODE`          | JWT verification secret              | Required.                          |
| `RABBITMQ_URL`      | AMQP connection string               | Required.                          |
| `WEB_ORIGIN`        | CORS origin                          | Required. Crashes on missing.      |
| `PORT`              | Listen port                          | Defaults to `4011`                 |
| `OTEL_SERVICE_NAME` | Trace/log service tag                | Set to `"review-service"` in `.env` |
| `TEMPO_URL`         | OTLP trace endpoint                  | Same mismatch as other services.   |
| `BATCH_SIZE`        | Present in `.env`                    | Zero usages in `src/`. Dead.       |

## Tests

| Script          | What it runs              |
|-----------------|---------------------------|
| `test`          | Jest unit config          |
| `test:coverage` | Unit tests with coverage  |
| `test:watch`    | Jest in watch mode        |

**Phase 4:** `src/__tests__/integration/review.integration.test.ts` exists. No unit test for the handler layer; only `review.service.test.ts`.

## Operations

| Concern       | Detail                                                                 |
|---------------|------------------------------------------------------------------------|
| Health check  | `GET /health` - shallow.                                               |
| Metrics       | `GET /metrics` - no auth guard.                                        |
| Rate limiting | Gateway-enforced only.                                                 |