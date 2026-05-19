# Selleasi

Selleasi is a Shopify-style multi-tenant marketplace platform where each
seller gets an isolated subdomain, a scoped data store, and a full commerce
stack without sharing infrastructure with other sellers. I built it to solve
the hardest distributed systems problems in e-commerce: inventory consistency
under concurrent load, atomic payment processing, and reliable async event
delivery across independently deployable services.

Every record is scoped by `storeId` and `organizationId`. I favour consistency
over availability at the transaction boundary: inventory reservation is
synchronous and fail-fast, payment writes are atomic inside a MongoDB
transaction, and every critical event is published through a transactional
outbox so a broker outage never causes a split-brain between the payment
record and the event stream.

Built on Node.js 20, TypeScript 5, MongoDB, RabbitMQ, Redis, and the full
Grafana observability stack.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Service Catalogue](#service-catalogue)
3. [Technology Stack](#technology-stack)
4. [Infrastructure Overview](#infrastructure-overview)
5. [Architectural Patterns](#architectural-patterns)
6. [Event Choreography Chain](#event-choreography-chain)
7. [Subdomain and Store Context Flow](#subdomain-and-store-context-flow)
8. [Observability](#observability)
9. [Getting Started](#getting-started)
10. [Environment Variables](#environment-variables)
11. [Testing Strategy](#testing-strategy)
12. [Load Testing](#load-testing)
13. [Chaos Engineering](#chaos-engineering)
14. [Architecture Decision Records](#architecture-decision-records)
15. [Roadmap](#roadmap)

---

## System Architecture

All client traffic routes through the API Gateway at port 8000. The gateway
enforces JWT authentication, subdomain resolution, rate limiting via a
database-backed rules engine, and circuit breaking via Opossum before proxying
downstream. Every request arriving on a store subdomain
(`storename.selleasi.com`) is resolved to a `storeId` and `organizationId`
at the gateway edge and injected into downstream requests as headers. No
downstream service accepts store context from the client.

Inventory and payment are the consistency boundary. Reservation is synchronous
HTTP, fail-fast. Payment commits atomically across the payment record, ledger
entry, wallet balance, and outbox event in a single MongoDB transaction.
RabbitMQ handles all async choreography without blocking the request path.

---

## Service Catalogue

| Service | Port | Responsibility |
|---|---|---|
| api-gateway | 8000 | JWT auth, subdomain resolution, rate limiter rules engine, circuit breaker, Swagger aggregator |
| authentication | 4001 | Registration, OTP 2FA via Twilio, JWT issuance, refresh rotation, blocklist, RBAC |
| audit | 4002 | Immutable append-only audit log, consumes events from all services |
| products | 4003 | Product CRUD, outbox pattern, Elasticsearch sync via ngram index |
| payment | 4004 | Paystack and Flutterwave, HMAC webhook verification, ledger, wallet, payout, outbox poller |
| categories | 4005 | Product category taxonomy |
| notification | 4006 | Email via Resend, SMS via Twilio, nine event-driven handlers |
| stores | 4007 | Store creation, subdomain registration via Caddy admin API, custom domain verification |
| inventory | 4008 | Three-field stock accounting, MVCC optimistic concurrency, TTL reservations |
| cart | 4009 | Per-store per-user cart, Redis distributed lock, TTL expiry |
| organization | 4010 | Organization provisioning saga, plan management |
| review | 4011 | Product reviews scoped by store, verified purchase flag, moderation |
| orders | 4012 | Checkout saga, order state machine, fulfillment tracking, PDF receipt generation |
| color | 4013 | Color catalogue for product variants |
| view | 4014 | Storefront view aggregation |
| size | 4015 | Size catalogue for product variants |
| users | 4016 | User profile management |
| subscription | 4017 | Plan features, trial management, commission rate lookup |
| escrow | 4018 | Escrow, dispute, and payout domain |

---

## Technology Stack

**Runtime.** Every service runs on Node.js 20 and TypeScript 5 with Express 4.
All Dockerfiles use `node:20-alpine` and `npm ci --omit=dev` to keep
production images lean.

**Databases.** MongoDB via Mongoose with a dedicated database per service.
No cross-service joins. Multi-document ACID transactions via
`session.withTransaction` for operations that must be atomic across multiple
collections.

**Message broker.** RabbitMQ 3.13 with quorum queues, per-exchange DLX, and
`x-delivery-limit: 5`. All exchanges are topic type. Every queue declares a
dead letter exchange so permanently failed messages are routed to the DLX
instead of being dropped. I replaced Kafka with RabbitMQ to eliminate the
KRaft cluster overhead that was not justified at the current scale.

**Caching and coordination.** Redis 7 via ioredis for rate-limit counters,
OTP TTL, refresh-token storage, idempotency NX keys for consumers, cart
distributed lock, subdomain resolution cache, and pub/sub for rules-engine
invalidation.

**Search.** Elasticsearch 8.11 with ngram tokenizer (min=3, max=10) at index
time and standard tokenizer at query time. MongoDB is the source of truth.
Elasticsearch is an eventually consistent read replica synced via the products
outbox.

**Payment.** Paystack and Flutterwave. The PSP is selected per request.
Every webhook is verified with HMAC signature validation. Duplicate payloads
are deduplicated with a SHA-256 hash stored inside the same MongoDB
transaction as the payment record update. Amount is always read from the order
record server-side. The client-supplied amount is never trusted.

**Subdomain routing.** Caddy 2 handles wildcard TLS and proxies all traffic
to the API Gateway with `X-Forwarded-Host`. The gateway resolves the subdomain
to store context via a Redis-cached lookup backed by stores-service. Store
context is injected as headers on every downstream request.

**Notifications.** Resend SDK for transactional email. Twilio for SMS. All
templates are inline TypeScript functions returning HTML strings. No
Handlebars, no file system reads at runtime.

**File storage.** Cloudinary for PDF receipts and product images.

**Receipt generation.** pdfkit generates receipts in memory. The buffer is
uploaded directly to Cloudinary and the `receiptUrl` persisted on the order
document then included in the `order.completed` RabbitMQ event payload.

---

## Infrastructure Overview

**Dev.** Docker Compose with a single MongoDB instance, Redis, RabbitMQ with
management UI, single-node Elasticsearch, Caddy, and the full Grafana stack.
Minimum 8 GB RAM recommended, 16 GB comfortable.

**Prod.** Single VPS with k3s. Istio service mesh with Envoy sidecar per pod,
mTLS strict across the selleasi namespace. ArgoCD for GitOps continuous
deployment. MongoDB Atlas for the database. Cloudflare for DNS and DDoS
mitigation.

**Healthchecks.** Every service exposes `GET /health` as the Docker
healthcheck target and `GET /metrics` as the Prometheus scrape target.

**Startup dependency order for a successful checkout.**

```
MongoDB + Redis + RabbitMQ
  authentication
  organization
  subscription
  stores
  products (requires Elasticsearch healthy)
  inventory
  cart
  orders (requires cart healthy, inventory healthy)
  payment (requires orders healthy)
  notification
  review
  audit
```

---

## Architectural Patterns

### Vertical Slice Domain Structure

Each service is organized by domain, not by technical layer. Everything
related to a domain lives in one folder.

```
src/domains/payment/
  payment.model.ts
  payment.repository.ts
  payment.service.ts
  payment.controller.ts
  payment.routes.ts
  payment.dto.ts
  payment.validator.ts
```

Working on payment means all files are in one place. Deleting a domain is one
folder delete. Extracting a domain into a new service is a folder move.

### Transactional Outbox

For payment I commit the status update, ledger credit, wallet balance
increment, and outbox event in a single MongoDB `withTransaction`. A poller
running every 5 seconds reads unsent outbox records, publishes them to
RabbitMQ, and marks them processed. A broker outage queues events in MongoDB
rather than losing them or failing the payment write.

`LedgerRepository.creditOnPaymentConfirmed` accepts an external session
so it joins the caller's transaction without opening a nested
`withTransaction`, which MongoDB does not support.

The same pattern is used in products-service for Elasticsearch sync.

### Choreography-Based Saga

No central orchestrator. Each service reacts to RabbitMQ events, runs its
local transaction, and publishes the next event. Compensation runs in reverse
order: if inventory reservation fails for item N, reservations for items
0..N-1 are released synchronously before emitting
`inventory.reservation.failed` to the orders exchange.

Inventory reservation during checkout is synchronous HTTP deliberately. The
trade-off is higher checkout latency in exchange for zero oversell.

### Inventory Three-Field Accounting

```
Invariant:  onHand = available + reserved   (enforced at every write)

Reserve:    available -= N  ($gte: N guard, fails atomically if insufficient)
            reserved  += N

Commit:     onHand    -= N  (permanent sale, on ORDER_STOCK_COMMITTED)
            reserved  -= N

Release:    available += N  (compensation or TTL expiry)
            reserved  -= N
```

MongoDB `$inc` with a `$gte` predicate guard makes check-and-decrement atomic
with no application-level check-then-act race.

### MVCC Optimistic Concurrency on Inventory

Every inventory document carries a `__v` version field. Reserve, release,
and commit all follow the same pattern.

```
Read document at version N
  attempt write with { __v: N } in query predicate
    success:  document is now version N+1
    null:     version mismatch, another writer committed first
      retry:  re-read at version N+1, attempt with { __v: N+1 }
```

This will obvously eliminates the lock acquisition bottleneck that caused cascading 409
timeouts under concurrent load. Under normal load conflicts are rare. Under
flash-sale conditions the retry budget absorbs contention without the
cascading timeout behaviour a Redis mutex produces.

Load tests also confirmed the old Redis NX mutex produced a concurrency cliff at
approximately 50 VUs on a single product. MVCC removes that cliff. The retry
budget is 5 attempts with `BASE_DELAY * 2^attempt + jitter` between each.

### Subdomain Store Context Injection

Every store gets a subdomain (`storename.selleasi.com`) registered in Caddy.
The API Gateway extracts the subdomain from `X-Forwarded-Host`, resolves it
to `storeId` and `organizationId` via a Redis-cached lookup against
stores-service, and injects the context as headers before proxying.

```
x-store-id               storeId of the subdomain owner
x-store-organization-id  organizationId of the store owner
x-store-name             store display name
```

Downstream services read `x-store-id` with a path param fallback. A buyer on
`nike.selleasi.com` can never access `adidas` store data by manipulating the
request because the gateway-injected header always takes priority.

### Idempotency

Every RabbitMQ consumer sets a Redis NX key (`eventType:sagaId`) before
processing. A duplicate delivery results in a silent ack and drop. For
webhooks a SHA-256 hash of the payload is stored inside the same
`withTransaction` as the payment update. This protects against duplicates
even after the NX key TTL expires.

### Circuit Breaker

Opossum at the gateway with a custom `errorFilter` ignoring 4xx responses.
Only 5xx responses and timeouts increment the failure counter. Validation
errors under load do not trip the breaker on a healthy service.

### JWT and Session Management

Short-lived stateless access tokens with 15-minute TTL, never checked against
Redis on the hot path. Refresh tokens are `nanoid(32)` strings with a 7-day
TTL in Redis, rotated on every use. On logout a blocklist key is written per
`userId` with TTL equal to the remaining access token lifetime.

`organizationId` is never read from the request body or params. It is always
injected from the verified JWT or from the gateway subdomain context.

---

## Event Choreography Chain

```
checkout (HTTP, synchronous)
  orders-service creates order in PAYMENT_PENDING
    publishes order.created to selleasi.orders exchange

payment.initiated (outbox poller, 5s)
  orders marks PAYMENT_INITIATED

webhook arrives from PSP (HTTP)
  webhook-service verifies HMAC signature
  amount validated against order snapshot
    mismatch: payment marked FAILED
              PAYMENT_FAILED published via outbox
    match:    payment marked SUCCESS
              ledger CREDIT + FEE written in same transaction
              wallet balance incremented in same transaction
              PAYMENT_CONFIRMED written to outbox

payment.confirmed (outbox poller, 5s)
  orders marks COMPLETED
    generates PDF receipt via pdfkit
    uploads to Cloudinary, persists receiptUrl
    publishes order.completed to selleasi.orders exchange
      notification sends confirmation email with receiptUrl
      cart clears via order.stock.committed

payment.failed (outbox poller, 5s)
  orders marks FAILED
    publishes order.failed to selleasi.orders exchange

inventory.reservation.failed
  orders marks OUT_OF_STOCK
    publishes cart.item.out_of_stock to selleasi.cart exchange
      cart marks unavailable items with reason

order.abandoned (scheduler, 30 min timeout)
  orders marks CANCELLED
    publishes order.abandoned to selleasi.orders exchange
      inventory releases reserved stock

product.created (outbox poller, 5s)
  inventory creates inventory record
  Elasticsearch upserts product document (MongoDB _id as ES doc _id)

review.approved
  audit logs review.approved event

payment.refunded
  audit logs payment.refunded event
  ledger REFUND debit written against wallet
```

Every consumer guarantees:

- OTel trace propagation via B3 headers across RabbitMQ message boundaries
- Exponential backoff with jitter per retry iteration, never module-level constant
- Redis NX idempotency key per sagaId
- `channel.nack` with requeue false after MAX_RETRIES routing to DLX
- `channel.ack` only after handler completes successfully

---

## Subdomain and Store Context Flow

```
Buyer visits storename.selleasi.com

Caddy receives request
  forwards to api-gateway:8000 with X-Forwarded-Host: storename.selleasi.com

Gateway subdomainResolver middleware
  extracts subdomain: "storename"
  checks Redis: subdomain:storename
    hit:  returns cached { storeId, organizationId, storeName }
    miss: calls stores-service GET /internal/subdomain/storename
          caches result for 300 seconds
          returns { storeId, organizationId, storeName }

Gateway proxy handler
  injects x-store-id x-store-organization-id x-store-name on all requests
  injects x-user-id x-user-type x-organization-id from verified JWT

Downstream service controller
  const storeId = ctx.store.storeId ?? req.params.storeId
  gateway-injected value always takes priority over path param or body
```

---

## Observability

Trace context propagates end-to-end across HTTP and RabbitMQ boundaries.

**Over HTTP.** The gateway injects B3 headers into every proxied request.
Downstream services extract and continue the span.

**Over RabbitMQ.** `propagation.inject` writes `traceparent` into message
headers on the producer side. The consumer extracts the header, restores
the parent context with `context.with()`, and creates a `SpanKind.CONSUMER`
child span. `span.end()` is always called in `finally`.

**In logs.** Winston instrumentation reads the active span and injects
`trace_id`, `span_id`, and `trace_flags` into every log record. Clicking
`trace_id` in the Loki log explorer jumps directly to the Tempo trace.

| Endpoint | Purpose |
|---|---|
| http://localhost:3001 | Grafana dashboards, log explorer, trace viewer |
| http://localhost:9091 | Prometheus raw metrics |
| http://localhost:3101 | Loki log aggregation |
| http://localhost:3201 | Tempo distributed traces |
| http://localhost:15672 | RabbitMQ management UI |
| http://localhost:9200 | Elasticsearch |
| http://localhost:8000/api-docs | Swagger UI aggregated across all services |

---

## Getting Started

### Prerequisites

Docker Engine 24+ and Docker Compose 2+. Node.js 20+ for running scripts
outside containers.

### Clone and configure

```bash
git clone https://github.com/<your-org>/selleasi.git
cd selleasi

# Copy and fill root env file
cp .env.example .env
# Edit .env and fill in all secrets before continuing

# Generate all service .env files
chmod +x generate-envs.sh
./generate-envs.sh
```

### Start the stack

```bash
chmod +x dev.sh
./dev.sh up
```

### Verify the stack is healthy

```bash
# All containers should show healthy or running
./dev.sh ps

# Gateway
curl -f http://localhost:8000/health

# RabbitMQ management UI
open http://localhost:15672

# Elasticsearch cluster health
curl -f http://localhost:9200/_cluster/health

# Grafana
open http://localhost:3001
```

### Useful dev commands

```bash
./dev.sh logs              # tail all service logs
./dev.sh logs orders       # tail a single service
./dev.sh restart           # down then up with rebuild
./dev.sh clean             # removes all volumes, destructive
```

---

## Environment Variables

The root `.env` carries all shared secrets. Service `.env` files carry only
service-specific values. Docker Compose loads both via `env_file` ordering
with the service file winning on conflict.

### Root `.env`

```bash
REDIS_PASSWORD=
IO_REDIS_URL=redis://:your_password@redis:6379

JWT_CODE=

INTERNAL_SECRET=

RABBITMQ_DEFAULT_USER=
RABBITMQ_DEFAULT_PASS=
RABBITMQ_URL=amqp://user:pass@rabbitmq:5672/selleasi
RABBITMQ_DEFAULT_VHOST=selleasi

WEB_ORIGIN=http://localhost:5173
BASE_DOMAIN=selleasi.com

OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318

GRAFANA_ADMIN_USER=
GRAFANA_ADMIN_PASSWORD=
```

### Service-specific additions

```bash
# authentication-service
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
SMS_FROM_NUMBER=+1234567890

# notification-service
RESEND_API_KEY=
EMAIL_FROM=Selleasi <no-reply@selleasi.com>

# payment-service
PAYSTACK_SECRET_KEY=
FLW_SECRET_KEY=
PLATFORM_FEE_RATE=0.05

# orders-service
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# products-service
ELASTICSEARCH_URL=http://elasticsearch:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=

# stores-service
CADDY_ADMIN_URL=http://caddy:2019
CADDY_BASE_DOMAIN=selleasi.com
```

Generate strong secrets for `JWT_CODE` and `INTERNAL_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run it twice, once for each secret.

---

## Testing Strategy

I weight the test pyramid toward unit tests at 70%, integration tests at 20%,
and load tests at 10%.

### Unit tests

Service and repository layers tested in isolation with mocked dependencies.
Coverage targets: inventory accounting invariants, MVCC version conflict
handling, saga compensation logic, token rotation, ledger credit operations,
idempotency key handling, fulfillment state machine transitions, subdomain
extraction logic, isValidRating type guard.

```bash
cd backend/<service>
npm test
npm run test:coverage
```

### Integration tests

Controller-level tests against a real MongoDB instance running in Docker. A
real HTTP request enters the Express router, passes through all middleware,
and hits the service layer. Catches middleware ordering bugs, wrong status
codes, malformed response shapes, and auth bypass regressions.

```bash
./dev.sh up
cd backend/<service>
npm run test:integration
```

### Contract tests

Gateway proxy tests verifying each service responds correctly to
`x-internal-secret` and returns the expected response shape. Prevents silent
contract drift between the gateway routing table and downstream service routes.

---

## Load Testing

Scripts live in `_infrastructure/k6/scripts/`.

### Checkout saga end-to-end

Ramp 10 to 100 VUs over 5 minutes through the full gateway.
Threshold: p95 < 2s, error rate < 1%.

```bash
k6 run _infrastructure/k6/scripts/checkout-saga-e2e.js
```

### Inventory correctness under concurrency

50 concurrent VUs against a single product with `quantityAvailable = 10`.
Asserts exactly 10 reservations succeed, zero oversell, and the invariant
`onHand = available + reserved` holds after all VUs complete.

```bash
k6 run _infrastructure/k6/scripts/inventory-concurrent.js
```

### Cart lock contention

Concurrent `addToCart` for the same user and store.
Validates Redis distributed lock holds under pressure.

```bash
k6 run _infrastructure/k6/scripts/cart-lock.js
```

### Webhook idempotency flood

Send the same `transactionId` payload 10 times simultaneously.
Assert exactly 1 write reaches MongoDB.

```bash
k6 run _infrastructure/k6/scripts/webhook-flood.js
```

### Rate limiter precision

Send exactly N+1 concurrent requests to a rate-limited route.
Assert exactly 1 receives HTTP 429.

```bash
k6 run _infrastructure/k6/scripts/rate-limiter.js
```

### Subdomain resolution under load

1000 concurrent requests to the same subdomain.
Validates Redis cache prevents stores-service saturation.

```bash
k6 run _infrastructure/k6/scripts/subdomain-resolution.js
```

---

## Chaos Engineering

Scripts live in `_infrastructure/chaos/scenarios/`.

| Scenario | Script | Expected behaviour |
|---|---|---|
| Redis goes down | `redis-down.sh` | authenticate returns 503, cart lock returns 409, services recover on restart |
| RabbitMQ goes down | `rabbitmq-down.sh` | outbox poller retries on reconnect, no events lost via DLX |
| Inventory service down during checkout | `inventory-down.sh` | orders releases already-reserved items via compensation, buyer receives clear error |
| Payment service down after order created | `payment-down.sh` | order sits in PAYMENT_PENDING, abandoned order scheduler cancels after 30 minutes |
| MongoDB latency 500ms | `mongo-latency.sh` | services with 8s timeouts do not cascade fail, circuit breakers do not open prematurely |
| Notification service down | `notification-down.sh` | all other services continue normally, events queue in RabbitMQ DLX, delivered on recovery |

Run all scenarios:

```bash
chmod +x _infrastructure/chaos/runner.sh
./_infrastructure/chaos/runner.sh
```

---

## Architecture Decision Records

ADRs live in `_documentation/adr/`.

### Infrastructure

| ADR | Decision |
|---|---|
| ADR-INFRA-001 | Replaced Kafka with RabbitMQ. KRaft cluster RAM overhead not justified at current scale. Quorum queues with DLX provide equivalent durability guarantees. |
| ADR-INFRA-002 | Replaced Mailersend with Resend SDK. Simpler API, no axios wrapper needed, native TypeScript types. |
| ADR-INFRA-003 | Replaced Opossum circuit breaker in individual services with Istio DestinationRule outlier detection in production. Opossum retained at gateway only. |
| ADR-INFRA-004 | Replaced Nginx with Caddy for subdomain routing. Caddy admin API allows dynamic route registration without config file reloads. |

### Inventory

| ADR | Decision |
|---|---|
| ADR-INV-001 | Replaced Redis NX distributed locking with MVCC optimistic concurrency. Eliminates lock contention cliff at 50 VUs. |
| ADR-INV-002 | Inventory reservation during checkout is synchronous HTTP. Higher latency accepted in exchange for zero oversell guarantee. |

### Elasticsearch

| ADR | Decision |
|---|---|
| ADR-ES-001 | Node 20 required for ES client v8 compatibility |
| ADR-ES-002 | ES synced via outbox pattern not direct HTTP handler write |
| ADR-ES-003 | MongoDB `_id` used as ES document `_id` for idempotent upserts |
| ADR-ES-004 | Soft delete in ES via `isDeleted: true` filter, not hard delete |
| ADR-ES-005 | Separate ngram analyzer at index time, standard analyzer at query time |
| ADR-ES-006 | ES is a read replica only. MongoDB is source of truth. |

### Payment

| ADR | Decision |
|---|---|
| ADR-PAY-001 | Payment amount always read from order record server-side. Client amount never trusted. |
| ADR-PAY-002 | Webhook idempotency via SHA-256 hash stored inside the payment transaction, not only Redis NX. Protects against duplicates after NX TTL expiry. |
| ADR-PAY-003 | Ledger `creditOnPaymentConfirmed` accepts external session to join caller transaction. MongoDB does not support nested withTransaction. |

### Architecture

| ADR | Decision |
|---|---|
| ADR-ARCH-001 | Vertical slice domain structure per service. Files organized by domain not by technical layer. |
| ADR-ARCH-002 | Choreography-based saga with no central orchestrator. Each service owns its local transaction and publishes the next event. |
| ADR-ARCH-003 | Gateway subdomain resolver injects store context as headers. Downstream services never accept storeId from client body or params as primary source. |

---

## Roadmap

**Escrow and disputes.** escrow-service owns the full escrow lifecycle:
funds held on order completion, released to seller on buyer confirmation or
after the dispute window, with a dispute flow raising a case for admin
resolution.

**Payout completion.** Seller bank account model, Paystack Transfer API
on admin approval, `transfer.success` and `transfer.failed` webhook handlers,
PAYOUT ledger debit on success.

**Abandoned order scheduler.** Orders in PAYMENT_PENDING for more than
30 minutes are cancelled via an internal endpoint. Scheduler uses Redis sorted
set with Redlock leader election so only one instance runs across all replicas.

**Webhook retry scheduler.** payment-service `webhookService.retryFailed()`
triggered every 5 minutes via cron.

**ArgoCD GitOps pipeline.** k8s manifests, ApplicationSet for all services,
ArgoCD Image Updater watching container registry, GitHub Actions building and
pushing images on merge to main.

**Istio service mesh.** PeerAuthentication STRICT mTLS across selleasi
namespace, AuthorizationPolicy default-deny with per-service allow rules,
VirtualService retry and timeout per service, DestinationRule outlier
detection replacing Opossum in individual services.

**Load test results.** Run all k6 scripts after MVCC migration and publish
p50/p95/p99 latency, throughput, error rate under 100 VUs, and MVCC retry
rate.

**Documentation.** Per-service flow diagrams, `api/contracts.md`,
`api/error-codes.md`, and `operations/runbook.md` for each production service.