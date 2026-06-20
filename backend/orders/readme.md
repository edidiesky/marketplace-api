# Orders Service

Owns the order lifecycle for the marketplace: checkout (cart > reserved order), payment status tracking via the payment saga, fulfillment tracking, and order history for buyers and sellers.

**Port:** `4012`
**Database:** MongoDB
**Cache:** Redis (order/list read-through cache, consumer idempotency keys)
**Message broker:** RabbitMQ (topic exchanges: `orders`, `orders.dlx`, `payment`, `inventory`, `cart`, `notification`)

---

## Table of Contents

1. [What this service talks to](#what-this-service-talks-to)
2. [API](#api)
3. [Architecture decisions](#architecture-decisions)
4. [Prerequisites](#prerequisites)
5. [Local setup](#local-setup)
6. [Tests](#tests)
7. [Operations](#operations)
8. [Related Documentation](#related-documentation)

---

## What this service talks to

Outbound (synchronous, internal-only HTTP):
- **cart-service**: fetch cart snapshot at checkout (`GET /api/v1/carts/internal/:cartId`)
- **inventory-service**: reserve/release stock during checkout (`POST /api/v1/inventories/reserve` and `/release`)

Inbound/outbound (async, RabbitMQ):
- Consumes: `payment.completed`, `payment.failed`, `payment.initiated` (from payment-service), `inventory.reservation.failed` (from inventory-service)
- Publishes: `order.created`, `order.completed`, `order.failed`, `order.abandoned`, `cart.item.out_of_stock`

For the full order/fulfillment state machines, the checkout saga (reserve > create > compensate on failure), and failure-mode data flows: see [Orders TDD](../../_documentation/orders-tdd.md)
---

## API

Full request/response contracts and error model: [api/contracts.md](./api/contracts.md) (link target, doc to be written in Module 2).

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/orders/:storeId/checkout` | user | creates order from cart, reserves inventory, idempotent on `requestId` |
| GET | `/api/v1/orders/me` | user | buyer's order history, paginated |
| GET | `/api/v1/orders/:storeId/store` | user (seller) | store's orders, paginated, filterable by `orderStatus` |
| GET | `/api/v1/orders/detail/:id` | none | single order by id |
| PATCH | `/api/v1/orders/:orderId/shipping` | user | buyer sets shipping address, only while order is payment-pending |
| PATCH | `/api/v1/orders/:orderId/fulfillment` | user (seller) | seller advances fulfillment status |
| POST | `/api/v1/orders/internal/:orderId/abandon` | internal only | cancels stale unpaid orders, called by scheduler |

---

## Architecture decisions

Indexed in [architecture/decision/](./architecture/decision/) (to be populated in Module 4, e.g. RabbitMQ vs Kafka choice, receipt generation via Cloudinary, idempotency-key strategy for consumers).

---

## Prerequisites

- Node.js 20+
- Docker (for MongoDB, Redis, RabbitMQ via root `_infrastructure` docker compose)
- Cloudinary account (receipt PDF/image uploads), credentials from team lead
- Access to `cart-service` and `inventory-service` running locally or via the shared dev environment

---

## Local setup

```bash
cd backend/orders
cp .env.example .env
npm install
npm run dev
```

Required environment variables:

| Variable | Purpose |
|---|---|
| `PORT` | defaults to `4012` if unset |
| `DATABASE_URL` | MongoDB connection string |
| `RABBITMQ_URL` | RabbitMQ connection string, must point at the same broker as cart/payment/inventory services |
| `WEB_ORIGIN` | allowed CORS origin, throws on startup if unset |
| `INTERNAL_SECRET` | shared secret for internal-only routes (e.g. `/internal/:orderId/abandon`), throws on startup if unset |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | receipt upload, throws on startup if `CLOUDINARY_CLOUD_NAME` unset |
| `CART_SERVICE_URL` | base URL for cart-service internal API |
| `INVENTORY_SERVICE_URL` | base URL for inventory-service internal API |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | trace export target, defaults to `http://tempo:4318/v1/traces` |

Requires MongoDB, Redis, and RabbitMQ running locally (see root `_infrastructure` docker compose setup). RabbitMQ topology (exchanges, queues, DLQs) is asserted automatically on startup, no manual setup needed.

---

## Tests

```bash
npm test                  # unit
npm run test:integration  # requires the docker compose stack
```

---

## Operations

- Health check: `GET /health`
- Metrics (Prometheus): `GET /metrics`
- Runbook: [RUNBOOK.md](./RUNBOOK.md) (to be written in Module 5)

---

## Related Documentation

- **Technical design doc**: [Orders TDD](../../_documentation/orders-tdd.md), order/fulfillment state machines, checkout saga, failure-mode data flows (Module 3)
- **API contracts**: [api/contracts.md](./api/contracts.md), request/response shapes and error model (Module 2)
- **Architecture decisions**: [architecture/decision/](./architecture/decision/), index of ADRs for this service (Module 4)
- **Runbook**: [RUNBOOK.md](./RUNBOOK.md), alerts, diagnostics, remediation (Module 5)