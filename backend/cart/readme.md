# cart-service

Owns the Cart entity: per-user, per-store cart with item-level quantity tracking, TTL-based expiry, and Redlock-based optimistic concurrency on add/update operations. Participates in the checkout saga by exposing an internal cart-fetch endpoint to the orders service and consuming `order.stock.committed` to clear carts post-checkout.

## Key facts

| Property       | Value                                          |
|----------------|------------------------------------------------|
| Port           | 4009                                           |
| Container      | `selleazy_cart`                                |
| Database       | MongoDB (`SELLEASI_CART_API`)                  |
| Cache          | Redis (cart read cache, Redlock for concurrency) |
| Broker         | RabbitMQ                                       |
| Env files      | `.env` (root) + `backend/cart/.env`            |

## Inbound traffic

**Authenticated (JWT required):**
All customer-facing cart routes.

**Internal (`x-internal-secret` required):**
`GET /api/v1/carts/internal/:cartId` - fetched by orders-service during checkout.

Note: cart's `internalOnly` middleware reads `INTERNAL_SECRET` at module load time. If the env var is not set at startup, the secret is permanently `""` for the process lifetime and an empty-string header would be admitted.

## Outbound

**RabbitMQ publishes:**

| Exchange        | Routing key              | Trigger                               |
|-----------------|--------------------------|---------------------------------------|
| `selleasi.cart` | `cart.item.added`        | Item added to cart                    |
| `selleasi.cart` | `cart.item.removed`      | Item removed from cart                |
| `selleasi.cart` | `cart.cleared`           | Cart cleared after stock committed    |
| `selleasi.cart` | `cart.item.out_of_stock` | Out-of-stock item re-emit             |

**RabbitMQ consumes:**

| Queue                                       | Routing key              | Handler                              |
|---------------------------------------------|--------------------------|--------------------------------------|
| `selleasi.cart.order.stock.committed.queue` | `order.stock.committed`  | Clears cart post-reservation         |
| `selleasi.cart.item.out_of_stock.queue`     | `cart.item.out_of_stock` | Removes out-of-stock items from cart |

## API route table

| Prefix          | Route file                        | Note                       |
|-----------------|-----------------------------------|----------------------------|
| `/api/v1/carts` | `src/domains/cart/cart.routes.ts` | All cart endpoints         |
| `/health`       | `src/app.ts`                      | Shallow                    |
| `/metrics`      | `src/app.ts`                      | Prometheus. No auth guard. |

See [API Contracts](./API_CONTRACTS.md).

## Environment variables

| Variable              | Purpose                        | Notes                               |
|-----------------------|--------------------------------|-------------------------------------|
| `DATABASE_URL`        | MongoDB connection string       | Required.                           |
| `REDIS_HOST/PORT/PASSWORD` | Redis connection           | Required in practice.               |
| `JWT_CODE`            | JWT verification secret         | Required.                           |
| `RABBITMQ_URL`        | AMQP connection string          | Required.                           |
| `WEB_ORIGIN`          | CORS origin                     | Required.                           |
| `INTERNAL_SECRET`     | Guards `/internal/*` endpoints  | Read at module load. Defaults `""`. |
| `PORT`                | Listen port                     | Defaults to `4009`                  |
| `PRODUCT_SERVICE_URL` | Present in service `.env`       | Zero usages in `src/`. Dead.        |
| `USER_SERVICE_URL`    | Present in service `.env`       | Zero usages in `src/`. Dead.        |
| `BATCH_SIZE`          | Present in `.env`               | Zero usages in `src/`. Dead.        |
| `HOST`                | Present in `.env` as `0.0.0.0`  | Not used in `server.ts`. Dead.      |

## Tests

| Script | What it runs |
|--------|--------------|
| `test` | Jest unit config |

**Phase 4:** `cart.integration.test.ts`, `cart.repository.test.ts`, `cart.service.test.ts` all exist.

## Operations

| Concern       | Detail                                                                              |
|---------------|-------------------------------------------------------------------------------------|
| Health check  | `GET /health` - shallow.                                                            |
| Metrics       | `GET /metrics` - no auth guard.                                                     |
| Concurrency   | Redlock lock key: `cart:add:<storeId>:<userId>:<productId>:<idempotencyKey>`, TTL 10 s. |
| Cart TTL      | `CART_TTL_DAYS = 30`.                                                               |