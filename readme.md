# Selleasi Platform

Multi-tenant e-commerce marketplace. Sellers onboard via a 3-step flow (auth > organization > store), list products, manage inventory, receive orders, and collect payments. Customers browse, cart, checkout, and review purchases. All traffic enters through the API gateway.

## Architecture

```
Client > Caddy (TLS, subdomain routing) > api-gateway (8000)
                                                    |
              ┌─────────────────────────────────────┤
              |                                     |
        Public routes                     Authenticated routes
        /auth/*                           /:service/* + JWT
```

## Service inventory

| Port | Service | Container | Database | Notes |
|------|---------|-----------|----------|-------|
| 8000 | api-gateway | selleazy_api_gateway | MongoDB (`SELLEASI_RULES_API`) | JWT auth, rate limiting, circuit breaker, proxy |
| 4001 | authentication | selleazy_authentication | MongoDB (`SELLEASI_AUTH_API`) | Identity, JWT issuance, RBAC seed |
| 4002 | audit | selleazy_audit | | |
| 4003 | products | selleazy_products | | Products catalog; only `src.zip` provided contains the review service |
| 4004 | payment | selleazy_payment | MongoDB (`SELLEASI_PAYMENT_API`) | Paystack/Flutterwave, wallet, payout, outbox |
| 4006 | notification | selleazy_notification | MongoDB | Email (Resend), SMS (Twilio) |
| 4007 | stores | selleazy_stores | MongoDB (`SELLEASI_STORE_API`) | Store CRUD, subdomain, Caddy integration |
| 4008 | inventory | selleazy_inventory | MongoDB (`SELLEASI_INVENTORY_API`) | MVCC stock, reservations, saga participant |
| 4009 | cart | selleazy_cart | MongoDB (`SELLEASI_CART_API`) | Per-user per-store cart, saga participant |
| 4010 | organization | selleazy_organization | MongoDB (`SELLEASI_ORGANIZATION_API`) | Org entity, onboarding saga participant |
| 4011 | review | selleazy_review | MongoDB (`SELLEASI_REVIEW_API`) | Product reviews, moderation (`src.zip` mislabeled as products) |
| 4012 | orders | selleazy_orders | MongoDB (`SELLEASI_ORDERS_API`) | Checkout saga orchestrator |
| 4017 | subscription | selleazy_subscription | MongoDB | Billing plans |

**Commented out in docker-compose (not yet deployed):**
escrow (4018), users (4016), categories (4005), color (4013), size (4015), view (4014)

## Shared infrastructure

| Component | Container | Port (host) |
|-----------|-----------|-------------|
| Redis 7.0 | selleazy_redis | 6380 |
| RabbitMQ 3.13 | selleazy_rabbitmq | 5672, 15672 (mgmt), 15692 (metrics) |
| Elasticsearch 8.11 | selleazy_elasticsearch | 9200 |
| Caddy 2 | selleazy_caddy | 80, 443, 2019 (admin) |
| Prometheus | selleazy_prometheus | 9091 |
| Grafana | selleazy_grafana | 3001 |
| Loki | selleazy_loki | 3101 |
| Tempo | selleazy_tempo | 3201, 4319 (OTLP HTTP), 4320 (OTLP gRPC) |
| Promtail | selleazy_promtail | (no host port) |

## Network topology

| Network | Members |
|---------|---------|
| `selleasi-gateway` | caddy, api-gateway |
| `selleasi-services` | api-gateway, all business services, tempo, prometheus |
| `selleasi-data` | all business services, redis, rabbitmq, elasticsearch |
| `selleasi-monitoring` | prometheus, grafana, loki, promtail, tempo |
| `selleasi-frontend` | (reserved, frontend commented out) |

All business service ports are bound to `127.0.0.1` on the host. Redis (6380), RabbitMQ (5672, 15672, 15692), and Elasticsearch (9200) are bound to `0.0.0.0` — exposed to the host network without restriction.

## Onboarding saga

```
POST /auth/onboarding/initiate
  > email token in Redis
POST /auth/email/confirmation
  > step advances in Redis
POST /auth/signup
  > User created (status: DRAFT)
  > publishes user.onboarding.completed (selleasi.authentication exchange)
     > organization-service creates Organization (status: ACTIVE)
        > publishes organization.onboarding.completed (selleasi.organization exchange)
           > authentication-service: sets user.organizationId + status = active
           > subscription-service: creates subscription record
        > publishes notification.organization.onboarding.completed
           > notification-service: sends welcome email
     > on failure: publishes organization.onboarding.failed
        > authentication-service: deletes user (rollback)
```

## Order saga

```
POST /orders/:storeId/checkout
  > orders-service fetches cart (HTTP internal, cart-service)
  > orders-service reserves stock (HTTP internal, inventory-service, per item)
  > Order created (status: PENDING_PAYMENT)
  > publishes order.created (selleasi.orders exchange)
     > cart-service: clears cart on order.stock.committed
POST /payments/initialize
  > payment-service fetches order (HTTP internal, orders-service)
  > payment-service calls Paystack/Flutterwave
  > publishes payment.initiated
POST /api/v1/webhooks/:gateway  (unauthenticated)
  > payment-service verifies webhook signature
  > on success: publishes payment.completed
     > orders-service: marks order COMPLETED, uploads receipt to Cloudinary
     > notification-service: sends payment success email
  > on failure: publishes payment.failed
     > orders-service: marks order FAILED, publishes order.failed
        > inventory-service: releases reservation
        > notification-service: sends payment failed email
```

## RabbitMQ topology summary

| Exchange | Type | DLX |
|----------|------|-----|
| `selleasi.authentication` | topic | `selleasi.authentication.dlx` |
| `selleasi.organization` | topic | `selleasi.organization.dlx` |
| `selleasi.inventory` | topic | `selleasi.inventory.dlx` |
| `selleasi.orders` | topic | `selleasi.orders.dlx` |
| `selleasi.payment` | topic | `selleasi.payment.dlx` |
| `selleasi.cart` | topic | `selleasi.cart.dlx` |
| `selleasi.stores` | topic | `selleasi.stores.dlx` |
| `selleasi.review` | topic | `selleasi.review.dlx` |
| `selleasi.notification` | topic | (none observed) |

## Authentication model

- JWT (HS256), signed with `JWT_CODE`, 15 min TTL, issuer `selleasi`, audience `selleasi-client`
- Refresh token: opaque `nanoid(32)`, stored in Redis `refresh:<token>`, TTL 7200 s
- Blocklist: Redis `blocklist:<userId>`, TTL = remaining JWT lifetime
- Every downstream service verifies the JWT independently using the same `JWT_CODE`. No token relay.
- Internal service-to-service calls use `x-internal-secret` header checked against `INTERNAL_SECRET` env var.

## Internal auth note (Phase 8)

All internal-only endpoints (`/internal/*`, `/reserve`, `/release`, `/commit`) are guarded by `internalOnly` middleware that checks `x-internal-secret`. This shared-secret approach is the current mechanism. Phase 8 plans to replace it with mTLS (Istio). Until that migration completes, `INTERNAL_SECRET` must be treated as a high-value secret.

## Observability

- **Traces:** OTLP → Tempo (port 4318). Each service emits spans. Gateway reads `OTEL_EXPORTER_OTLP_ENDPOINT`; other services read `TEMPO_URL` (naming inconsistency - see individual service READMEs).
- **Metrics:** Each service exposes `GET /metrics` (Prometheus format, unauthenticated). Prometheus scrapes on port 9091. Grafana at port 3001.
- **Logs:** Winston structured JSON → stdout → Promtail → Loki → Grafana.
- **Health checks:** All services expose `GET /health`. All are shallow (return 200 only, no dependency checks).

## Environment files

Root `.env` provides shared secrets (Redis, RabbitMQ, JWT, INTERNAL_SECRET, OTEL endpoint, Elasticsearch, Grafana). Each service has its own `.env` with service-specific values (DATABASE_URL, PORT, OTEL_SERVICE_NAME, gateway credentials).

## Related documentation

- [api-gateway README](../api-gateway/README.md) | [API Contracts](../api-gateway/API_CONTRACTS.md)
- [authentication README](../authentication/README.md) | [API Contracts](../authentication/API_CONTRACTS.md)
- [organization README](../organization/README.md) | [API Contracts](../organization/API_CONTRACTS.md)
- [review README](../review/README.md) | [API Contracts](../review/API_CONTRACTS.md)
- [orders README](../orders/README.md) | [API Contracts](../orders/API_CONTRACTS.md)
- [cart README](../cart/README.md) | [API Contracts](../cart/API_CONTRACTS.md)
- [inventory README](../inventory/README.md) | [API Contracts](../inventory/API_CONTRACTS.md)
- [payment README](../payment/README.md) | [API Contracts](../payment/API_CONTRACTS.md)
- [stores README](../stores/README.md) | [API Contracts](../stores/API_CONTRACTS.md)