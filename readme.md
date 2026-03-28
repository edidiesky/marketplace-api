# Selleasi, Production-Grade Distributed Marketplace

A Shopify-style multi-tenant marketplace built on Node.js 20, TypeScript 5, MongoDB, Apache Kafka, and the full Grafana observability stack. Every engineering decision prioritises correctness under failure over simplicity under ideal conditions.

---

## Table of Contents

1. [Project Goals](#project-goals)
2. [System Architecture](#system-architecture)
3. [Service Catalogue](#service-catalogue)
4. [Technology Stack](#technology-stack)
5. [Infrastructure Overview](#infrastructure-overview)
6. [Architectural Patterns](#architectural-patterns)
7. [Kafka Choreography Chain](#kafka-choreography-chain)
8. [Observability](#observability)
9. [Getting Started](#getting-started)
10. [Environment Variables](#environment-variables)
11. [Testing Strategy](#testing-strategy)
12. [Performance Benchmarks](#performance-benchmarks)
13. [Roadmap](#roadmap)

---

## Project Goals

This project demonstrates how to design and operate an event-driven microservice platform at production scale. Core engineering focus areas:

**Distributed systems correctness.** The checkout flow is a choreography-based saga. Inventory reservation is synchronous and fail-fast to prevent oversell. Payment confirmation, ledger credit, wallet update, and outbox event are committed in a single MongoDB transaction so a Kafka outage never causes a split-brain between the payment record and the event stream.

**Multi-tenant isolation.** Every data record is scoped by `storeId`. The rate limiter, circuit breaker rules engine, and all Kafka consumer idempotency keys are tenant-aware.

**Observability-first design.** Every service ships structured JSON logs via Winston to Loki, Prometheus metrics, and distributed traces via OpenTelemetry to Tempo. `trace_id` and `span_id` are injected into every log line. Cross-service trace context propagates through HTTP headers (`traceparent`/`tracestate`) and Kafka message headers via the W3C + B3 composite propagator.

**Resilience engineering.** The API gateway uses Opossum circuit breakers with a tuned `errorFilter`: 4xx responses do not count as failures (client error, not service degradation), only 5xx and timeouts open the breaker. Kafka consumers use exponential backoff with jitter, Redis NX idempotency keys, manual offset commit after handler success, and a dead-letter queue after `MAX_RETRIES`.

**Security depth.** JWT with refresh-token rotation (old token deleted on issue of new), OTP-based 2FA with short TTL, HMAC signature verification on all PSP webhooks, SHA-256 deduplication of webhook payloads, and RBAC enforced at the gateway.

---

## System Architecture

```
                          ┌─────────────────────────────────────────────────────┐
                          │                  API Gateway :8000                   │
                          │  token-bucket rate limiter · circuit breaker (Opossum)│
                          │  rules engine (Redis pub/sub invalidation, 60s reload)│
                          │  Swagger UI aggregator · OTEL trace propagation       │
                          └────────────────────────┬────────────────────────────┘
                                                   │
        ┌──────────────────┬────────────────────┬──┴──────────────┬─────────────────┐
        │                  │                    │                 │                 │
  Auth :4001         Products :4002       Stores :4004      Cart :4009      Orders :4012
  JWT/OTP/RBAC       product catalog      tenant mgmt       Redis lock      saga orchestrator
                                                                            PDF receipt gen
        │                  │                    │                 │                 │
        └──────────────────┴────────────────────┴──────┬──────────┴─────────────────┘
                                                        │
                                          ┌─────────────┴─────────────┐
                                          │                           │
                                   Inventory :4008             Payment :4006
                                   3-field accounting           PSP integration
                                   Redlock + $gte guard         outbox pattern
                                   onHand=available+reserved    ledger + wallet
                                          │                           │
                                          └─────────────┬─────────────┘
                                                        │
                                              ┌─────────┴──────────┐
                                              │  Apache Kafka       │
                                              │  3-broker KRaft     │
                                              │  acks=-1, ISR≥2     │
                                              └─────────┬──────────┘
                                                        │
                                              Notification :4007
                                              email + in-app
```

---

## Service Catalogue

| Service | Port | Responsibility |
|---------|------|----------------|
| api-gateway | 8000 | Reverse proxy, token-bucket + sliding-window rate limiter, Opossum circuit breaker, rules engine, Swagger UI aggregator |
| auth | 4001 | Registration, OTP 2FA, JWT issuance, refresh-token rotation, RBAC |
| products | 4002 | Product CRUD, variant management |
| stores | 4004 | Store/tenant creation and management |
| inventory | 4008 | Three-field stock accounting (onHand = available + reserved), Redlock, TTL reservations |
| cart | 4009 | Per-store per-user cart state, Redis distributed lock, versioned cache |
| orders | 4012 | Checkout saga orchestration, order state machine, PDF receipt generation via pdfkit + Cloudinary |
| payment | 4006 | Paystack/Flutterwave integration, HMAC webhook verification, ledger, wallet, outbox pattern |
| notification | 4007 | Email dispatch with receipt URL attachment |

Swagger docs for each service are served at `GET /openapi.json`. The gateway aggregates all specs at `GET /api-docs/swagger.json` (cached 60 s) with paths prefixed by service name (e.g. `/orders/api/v1/orders/checkout`). Swagger UI: `http://localhost:8000/api-docs`.

---

## Technology Stack

**Runtime.** Node.js 20 + TypeScript 5. Express 4.

**Databases.** MongoDB Atlas via Mongoose. Per-service databases — no cross-service joins. Multi-document ACID transactions via `withSession`/`withTransaction`. All indexes declared on schema.

**Caching and distributed coordination.** Redis 7 via ioredis. Roles: rate-limit counters, OTP store, refresh-token store, Redlock distributed mutex for inventory writes, idempotency NX keys for Kafka consumers, cart versioned cache, pub/sub for rules-engine invalidation.

**Event streaming.** Apache Kafka 3 (KRaft mode, no ZooKeeper). Dev: 3-broker Docker Compose cluster. Prod: Confluent Cloud (saves ~6 GB RAM on a 4 GB VPS). Config: `acks=-1`, `idempotent: true`, `MIN_INSYNC_REPLICAS=2`, `AUTO_CREATE_TOPICS_ENABLE=false`. Partition strategy based on LCM of consumer group sizes for even distribution.

**Payment.** Paystack + Flutterwave. Gateway selected per request. HMAC signature verification per gateway. Webhook idempotency via SHA-256 hash + Redis NX lock.

**File storage.** Cloudinary for PDF receipts and product images. Cloudflare R2 targeted for future migration.

**Receipt generation.** pdfkit (PDF in memory as Buffer) + qrcode (verification URL embedded). Buffer uploaded directly to Cloudinary; `receiptUrl` persisted on the order document and included in the `ORDER_COMPLETED` event payload.

**Observability.** Prometheus scrapes `/metrics` on every service. Grafana dashboards for latency histograms, error rates, and circuit breaker state. Loki aggregates structured JSON logs from all containers. Tempo receives distributed traces via OTEL. Winston instrumentation injects `trace_id`, `span_id`, and `trace_flags` into every log record.

**API gateway internals.** Custom Express proxy using axios with `validateStatus: (s) => s < 500` (4xx flows back to client, 5xx triggers circuit breaker). Webhook routes bypass auth and rate limiter. `traceparent` and `tracestate` forwarded on all proxied requests.

---

## Infrastructure Overview

**Dev.** Docker Compose. 3-broker Kafka KRaft cluster with `KAFKA_MIN_INSYNC_REPLICAS=2` and `KAFKA_DEFAULT_REPLICATION_FACTOR=3`. Single Nginx instance for SSL termination.

**Prod.** Single VPS (4 GB RAM). Confluent Cloud for Kafka (removes broker RAM overhead). MongoDB Atlas free tier. GitHub Actions CI/CD deploying via SSH. Cloudflare for DNS and DDoS mitigation.

**Healthchecks.** Every service exposes `GET /health` (Docker healthcheck) and `GET /metrics` (Prometheus scrape).

---

## Architectural Patterns

### Outbox pattern

Payment status update, ledger credit, wallet balance increment, and outbox event record are committed in a single MongoDB `withTransaction`. A separate poller (5 s interval) reads unsent outbox records and publishes them to Kafka, then marks them sent. This decouples Kafka availability from the payment write path: a Kafka outage queues events in MongoDB rather than failing the transaction or losing the event.

`LedgerRepository.creditOnPaymentConfirmed` accepts an external session parameter so it participates in the caller's transaction without opening a nested `withTransaction` (which is not supported in MongoDB).

### Saga (choreography)

No central orchestrator. Each service reacts to Kafka events, runs its local transaction, and publishes the next event. Compensation runs in reverse: if inventory reservation fails for item N, the saga releases items 0..N-1 that were already reserved, then emits `order.reservation.failed.topic` so the order state machine moves to `OUT_OF_STOCK`.

The checkout saga is deliberately synchronous for inventory reservation: HTTP call to the inventory service, fail fast, no optimistic reservation. This eliminates the class of oversell bugs that arise from async reservation patterns.

### Inventory three-field accounting

```
onHand = available + reserved     (invariant, enforced at write time)

Reserve:  available -= N  (with $gte: N guard — fails atomically if insufficient)
          reserved  += N

Commit:   onHand    -= N  (permanent sale)
          reserved  -= N

Release:  available += N  (compensation or TTL expiry)
          reserved  -= N
```

All three operations use MongoDB `$inc` inside a Redlock distributed lock scoped to the product. The `$gte` guard makes the decrement atomic and idempotent — the document update either succeeds fully or is rejected by the query predicate, no application-level check-then-act race.

### Idempotency

Kafka consumers set a Redis NX key (`eventType:eventId`) before processing. If the key already exists the message is silently dropped and the offset committed. This handles Kafka's at-least-once delivery guarantee.

Webhook idempotency uses a separate SHA-256 keyed hash of the payload stored in MongoDB (inside the same `withTransaction` as the payment update), preventing duplicate processing even if the NX key expires before a retry arrives.

### Circuit breaker

Opossum circuit breaker at the gateway with a custom `errorFilter`: 4xx responses are ignored (client error, not a sign of service degradation). Only 5xx responses and timeouts count as failures and move the breaker toward open. This avoids false positives from validation errors under load.

### Token rotation

On refresh, the old refresh token is deleted from Redis and a new one is written in a single pipeline. Access tokens are short-lived (15 min). Any concurrent request using the old refresh token after rotation gets a 401 and must re-authenticate.

---

## Kafka Choreography Chain

```
payment.confirmed (outbox poller)
  > order.payment.completed.topic
      > orders consumer:  order status > COMPLETED
                          generate PDF receipt (pdfkit)
                          upload to Cloudinary
                          persist receiptUrl on order
                          emit order.completed.topic (with receiptUrl)
      > inventory consumer: commitStock per item
                             emit order.stock.committed.topic
                               > cart consumer: clearCartByStoreId
                               > notification consumer: send confirmation email

payment.initiated (outbox poller)
  > order.payment.initiated.topic
      > orders consumer: order status > PAYMENT_INITIATED

order.payment.failed.topic
  > orders consumer:     order status > FAILED
  > inventory consumer:  releaseStock per item
  > payment consumer:    payment record > FAILED

order.reservation.failed.topic (emitted by inventory on $gte guard failure)
  > orders consumer:     order status > OUT_OF_STOCK
                         emit cart.item.out.of.stock.topic
                           > cart consumer: markItemsUnavailable
```

All consumers share the same guarantees: double `context.with()` for OTEL trace propagation, exponential backoff with jitter (`delay = 2^attempt × BASE_DELAY + random(JITTER)`), Redis NX idempotency per event, manual `commitOffsets` after successful handler, DLQ on parse failure and on final retry exhaustion.

---

## Observability

Trace context propagates end-to-end:

1. Client sends request to gateway.
2. Gateway injects `traceparent`/`tracestate` into proxy headers (W3C + B3 composite propagator).
3. Downstream service extracts and continues the span.
4. Kafka producer injects `traceparent` into message headers via `propagation.inject`.
5. Kafka consumers extract the header and wrap the handler in `context.with()` to restore the parent span before creating a `SpanKind.CONSUMER` child span.
6. Winston instrumentation reads the active span and injects `trace_id`, `span_id`, `trace_flags` into every log record.

Grafana datasources (Loki, Tempo, Prometheus) are provisioned automatically on stack startup. Log-to-trace correlation is via the `trace_id` field — clicking a trace ID in Loki jumps directly to the Tempo trace.

---

## Getting Started

### Prerequisites

Docker Engine 24+ and Docker Compose 2+. Node.js 20+ for local development outside containers. Minimum 8 GB RAM; 16 GB recommended for the full stack with Kafka, MongoDB, Redis, and all observability services.

### Start the stack

```bash
git clone https://github.com/<your-org>/selleasi.git
cd selleasi

# Copy env files per service
for svc in api-gateway auth products stores inventory cart orders payment notification; do
  cp $svc/.env.example $svc/.env
done

# Edit each .env with real secrets before starting
docker compose up -d
```

### Local endpoints

| Service | URL |
|---------|-----|
| API Gateway + Swagger UI | http://localhost:8000/api-docs |
| Grafana | http://localhost:3000 |
| Kafka UI | http://localhost:8080 |
| Prometheus | http://localhost:9090 |
| Loki | http://localhost:3100 |
| Tempo | http://localhost:3200 |

---

## Environment Variables

Common variables across all services:

```bash
NODE_ENV=development
PORT=                          # see service catalogue above
MONGO_URI=mongodb://localhost:27017/<service-db>
REDIS_URL=redis://localhost:6379
JWT_SECRET=
JWT_REFRESH_SECRET=
OTEL_SERVICE_NAME=             # matches service name in Grafana
INTERNAL_SECRET=               # x-internal-secret header for service-to-service calls
```

Payment service additional:

```bash
PAYSTACK_SECRET_KEY=
FLUTTERWAVE_SECRET_KEY=
PAYSTACK_WEBHOOK_SECRET=
FLUTTERWAVE_WEBHOOK_SECRET=
CLOUDINARY_URL=
```

See each service's `.env.example` for the full variable list.

---

## Testing Strategy

Unit tests cover individual functions and service-layer logic in isolation (mocked dependencies). Integration tests cover Kafka consumer handlers, database repositories, and internal HTTP calls against real infrastructure spun up in Docker. Load tests use k6 and target the full end-to-end stack.

**Coverage targets.**

| Tier | Target |
|------|--------|
| Unit | > 80% |
| Integration | > 60% |
| E2E / load | Critical paths only |

**Load test scenarios (k6, in progress).**

Checkout flow end-to-end: ramp 10 > 100 VUs over 5 minutes, assert p95 latency < 2 s, error rate < 1%.

Rate limiter precision: send exactly N+1 requests concurrently to a token-bucket-limited route, assert exactly 1 receives 429.

Webhook idempotency under concurrency: send the same `transactionId` payload 10 times simultaneously, assert exactly 1 write reaches MongoDB.

---

## Performance Benchmarks

Load tests are pending execution. This section will be updated with real p50/p95/p99 latency numbers, throughput (req/s), error rates under load, and circuit breaker trip thresholds once k6 results are collected.

---

## Roadmap

**Load testing (current).** k6 scripts for checkout E2E, rate limiter precision, and webhook concurrency. Target p95 < 2 s under 100 VUs.

**Elasticsearch sync.** Product, order, and store documents synced via Kafka outbox events. ngram analyzer for partial match, keyword fields for faceted filtering. Search API: `GET /search/products?q=&category=&minPrice=&maxPrice=&storeId=`. Autocomplete: `GET /search/autocomplete?q=`.

**Payout completion.** Seller bank account model. Paystack Transfer API on admin approval. Transfer webhook handling (`transfer.success` / `transfer.failed`). Ledger PAYOUT debit on success.

**Job scheduler.** Reservation TTL expiry (replace `setInterval`). Payout batch processing (Fridays 09:00). Order abandonment reminders (1 hr email, 24 hr cancel + inventory release). Redis sorted set scheduling. Redlock leader election with heartbeat and watchdog.

**ADRs.** Outbox vs CDC (Debezium trade-off), saga vs 2PC, inventory three-field accounting, circuit breaker error classification, Kafka partition strategy.