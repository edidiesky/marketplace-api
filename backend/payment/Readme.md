# payment-service

Owns the Payment entity, wallet balances, payout requests, and webhook processing. Integrates with Paystack and Flutterwave via an adapter/strategy pattern. Implements a transactional outbox for reliable event publishing. Maintains a ledger for wallet credit/debit audit trail.

## Key facts

| Property       | Value                                               |
|----------------|-----------------------------------------------------|
| Port           | 4004                                                |
| Container      | `selleazy_payment`                                  |
| Database       | MongoDB (`SELLEASI_PAYMENT_API`)                    |
| Cache          | Redis (idempotency keys, request coalescing)        |
| Broker         | RabbitMQ                                            |
| Env files      | `.env` (root) + `backend/payment/.env`              |

## Inbound traffic

**Public (no auth, no internal secret):**
`POST /api/v1/webhooks/:gateway` - Paystack/Flutterwave webhook. Signature verified via `x-paystack-signature` or `verif-hash` header depending on gateway.

**Authenticated (JWT required):**
All payment, wallet, and payout routes.

## Outbound HTTP (internal)

| Target | Endpoint | Trigger |
|--------|----------|---------|
| orders-service:4012 | `GET /api/v1/orders/detail/:orderId` | During payment initialization to fetch order amount |
| orders-service:4012 | `POST /api/v1/orders/internal/:orderId/abandon` | On terminal payment failure |

Both calls use `x-internal-secret` header.

## RabbitMQ publishes

| Exchange            | Routing key          | Trigger                         |
|---------------------|----------------------|---------------------------------|
| `selleasi.payment`  | `payment.initiated`  | Payment initialized with gateway |
| `selleasi.payment`  | `payment.completed`  | Webhook confirms payment success |
| `selleasi.payment`  | `payment.failed`     | Webhook confirms payment failure |
| `selleasi.payment`  | `payment.refunded`   | Refund initiated                 |
| `selleasi.notification` | (payment success/failure routing keys) | Triggers emails |

**RabbitMQ consumes:** None. `QUEUES` is empty in `constants.ts`. Payment is event-producer only; it receives webhook calls from gateways over HTTP.

## API route table

| Prefix              | Route file                                    | Note                            |
|---------------------|-----------------------------------------------|---------------------------------|
| `/api/v1/payments`  | `src/domains/payment/payment.routes.ts`       | Payment init, history, refund   |
| `/api/v1/wallets`   | `src/domains/wallet/wallet.routes.ts`         | Wallet read and reconcile       |
| `/api/v1/payouts`   | `src/domains/payout/payout.routes.ts`         | Payout request and approval     |
| `/api/v1/webhooks`  | `src/domains/webhook/webhook.routes.ts`       | Gateway webhook receiver        |
| `/health`           | `src/app.ts`                                  | Shallow                         |
| `/metrics`          | `src/app.ts`                                  | Prometheus. No auth guard.      |

See [API Contracts](./API_CONTRACTS.md).

## Environment variables

| Variable                | Purpose                                    | Notes                                        |
|-------------------------|--------------------------------------------|----------------------------------------------|
| `DATABASE_URL`          | MongoDB connection string                  | Required.                                    |
| `REDIS_HOST/PORT/PASSWORD` | Redis connection                        | Required in practice.                        |
| `JWT_CODE`              | JWT verification secret                    | Required.                                    |
| `RABBITMQ_URL`          | AMQP connection string                     | Required.                                    |
| `WEB_ORIGIN`            | CORS origin + payment callback URL base    | Required. Crashes on missing.                |
| `PAYSTACK_SECRET_KEY`   | Paystack API secret + webhook verification | Required. Crashes on missing.                |
| `PAYSTACK_PUBLIC_KEY`   | Paystack public key                        | Present in `.env`. Used by adapter.          |
| `FLW_SECRET_KEY`        | Flutterwave API secret                     | Required if Flutterwave is used as gateway.  |
| `INTERSWITCH_*`         | Interswitch credentials (6 vars)           | Present in `.env`. Adapter exists but usage depends on gateway selection. |
| `INTERNAL_SECRET`       | Outbound calls to orders-service           | Required.                                    |
| `ORDER_SERVICE_URL`     | Orders service base URL                    | Defaults to `http://orders:4012`             |
| `PLATFORM_FEE_RATE`     | Platform fee percentage                    | Defaults to `0.05` (5%)                      |
| `PORT`                  | Listen port                                | Defaults to `4007` (bug: should be 4004)     |
| `OTEL_SERVICE_NAME`     | Trace/log service tag                      | Set to `"payment-service"` in `.env`         |
| `BATCH_SIZE`            | Present in `.env`                          | Zero usages in `src/`. Dead.                 |
| `HOST`                  | Present in `.env` as `0.0.0.0`             | Not used in `server.ts`. Dead.               |

**Port default bug:** `server.ts` line 10 reads `process.env.PORT ?? 4007`. The correct port is 4004 (per docker-compose). The service `.env` sets `PORT=4004` which overrides this, so it works in practice but the fallback is wrong.

## Tests

| Script | What it runs |
|--------|--------------|
| `test` | Jest unit config |

**Phase 4:** `payment.integration.test.ts` and `payment.service.test.ts` exist.

## Operations

| Concern          | Detail                                                                                |
|------------------|---------------------------------------------------------------------------------------|
| Health check     | `GET /health` - shallow.                                                              |
| Metrics          | `GET /metrics` - no auth guard.                                                       |
| Idempotency      | Webhook calls deduplicated via SHA-256 hash stored in MongoDB `IdempotencyKey` collection. |
| Outbox           | `outboxPoller.ts` polls the MongoDB outbox collection and publishes pending events to RabbitMQ. Provides at-least-once delivery for payment events. |
| Wallet           | Credit/debit recorded in `Ledger` collection. `Wallet.balance` updated atomically.   |
| Platform fee     | Deducted at payment completion. Rate: `PLATFORM_FEE_RATE` (default 5%).              |