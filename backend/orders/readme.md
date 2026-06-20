# orders-service

Orchestrates the checkout saga: fetches the cart, reserves stock from inventory (per item, HTTP internal), creates the order record, and coordinates state transitions driven by downstream payment events via RabbitMQ. Owns fulfillment status tracking and receipt generation (Cloudinary PDF upload).

## Key facts

| Property       | Value                                          |
|----------------|------------------------------------------------|
| Port           | 4012                                           |
| Container      | `selleazy_orders`                              |
| Database       | MongoDB (`SELLEASI_ORDERS_API`)                |
| Cache          | Redis (via `redLock.ts` for saga coordination) |
| Broker         | RabbitMQ                                       |
| Env files      | `.env` (root) + `backend/orders/.env`          |

## Inbound traffic

**Public (no auth):**
`GET /api/v1/orders/detail/:id` - fetches a single order by MongoDB `_id`. No JWT required. Returns full order data including cartItems, totalPrice, userId, sellerId, and transactionId.

**Authenticated (JWT required):**
All other routes except the internal abandon endpoint.

**Internal (`x-internal-secret` required):**
`POST /api/v1/orders/internal/:orderId/abandon` - called by the payment service on terminal payment failure.

## Outbound HTTP (internal)

| Target | Endpoint | Trigger |
|--------|----------|---------|
| cart-service:4009 | `GET /api/v1/carts/internal/:cartId` | During checkout to fetch cart snapshot |
| inventory-service:4008 | `POST /api/v1/inventories/reserve` | Per cart item during checkout |

Both calls use `x-internal-secret` header and an 8 s timeout via `AbortController`.

## RabbitMQ publishes

| Exchange            | Routing key               | Trigger                             |
|---------------------|---------------------------|-------------------------------------|
| `selleasi.orders`   | `order.created`           | Checkout completes successfully     |
| `selleasi.orders`   | `order.completed`         | Payment confirmed via webhook       |
| `selleasi.orders`   | `order.failed`            | Payment failure confirmed           |
| `selleasi.orders`   | `order.abandoned`         | Internal abandon endpoint called    |
| `selleasi.orders`   | `cart.item.out_of_stock`  | Inventory reservation fails for an item |

## RabbitMQ consumes

| Queue                                                    | Routing key                     | Handler                                      |
|----------------------------------------------------------|---------------------------------|----------------------------------------------|
| `selleasi.orders.payment.completed.queue`                | `payment.completed`             | Marks order COMPLETED, generates receipt     |
| `selleasi.orders.payment.failed.queue`                   | `payment.failed`                | Marks order FAILED                           |
| `selleasi.orders.payment.initiated.queue`                | `payment.initiated`             | Updates order with payment reference         |
| `selleasi.orders.inventory.reservation.failed.queue`     | `inventory.reservation.failed`  | Marks order FAILED, releases reservation     |

## API route table

| Prefix              | Route file                               | Note                                  |
|---------------------|------------------------------------------|---------------------------------------|
| `/api/v1/orders`    | `src/domains/order/order.routes.ts`      | All order endpoints                   |
| `/health`           | `src/app.ts`                             | Shallow                               |
| `/metrics`          | `src/app.ts`                             | Prometheus. No auth guard.            |

See [API Contracts](./API_CONTRACTS.md).

## Environment variables

| Variable                | Purpose                                     | Notes                                    |
|-------------------------|---------------------------------------------|------------------------------------------|
| `DATABASE_URL`          | MongoDB connection string                   | Required.                                |
| `REDIS_HOST/PORT/PASSWORD` | Redis connection                         | Required in practice.                    |
| `JWT_CODE`              | JWT verification secret                     | Required.                                |
| `RABBITMQ_URL`          | AMQP connection string                      | Required.                                |
| `WEB_ORIGIN`            | CORS origin                                 | Required.                                |
| `INTERNAL_SECRET`       | Guards internal endpoints and outbound calls | Required. Defaults to `""` if missing.  |
| `CART_SERVICE_URL`      | Cart service base URL                       | Defaults to `http://cart:4009`           |
| `INVENTORY_SERVICE_URL` | Inventory service base URL                  | Defaults to `http://inventory:4008`      |
| `PORT`                  | Listen port                                 | Defaults to `4012`                       |
| `OTEL_SERVICE_NAME`     | Trace/log service tag                       | Set to `"orders-service"` in `.env`      |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary for receipt PDF uploads          | Required for receipt generation.         |
| `CLOUDINARY_API_KEY`    | Cloudinary credential                       | Committed in service `.env` (test key).  |
| `CLOUDINARY_API_SECRET` | Cloudinary credential                       | Committed in service `.env` (test key).  |
| `BATCH_SIZE`            | Present in `.env`                           | Zero usages in `src/`. Dead.             |

## Tests

| Script | What it runs |
|--------|--------------|
| `test` | Jest unit config |

**Phase 4:** `orders.integration.test.ts` and `orders.service.test.ts` exist. Integration tests require live cart and inventory services.

## Operations

| Concern         | Detail                                                                                       |
|-----------------|----------------------------------------------------------------------------------------------|
| Health check    | `GET /health` - shallow.                                                                     |
| Metrics         | `GET /metrics` - no auth guard.                                                              |
| Rate limiting   | Gateway-enforced only.                                                                       |
| Fulfillment FSM | Transitions validated by `fulfillmentTransitions.ts`. Invalid transitions rejected with 400. |