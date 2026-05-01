# API Gateway Service
Single entry point for all of my client traffic. It basically handles authentication enforcement, circuit breaking, service routing, observability instrumentation, and malicious probe blocking.
**Port:** `8000` 
---

## Table of Contents

1. [Functional Requirements](#functional-requirements)
2. [Non-Functional Requirements](#non-functional-requirements)
3. [Architecture & Design Decisions](#architecture--design-decisions)
4. [Request Flow](#request-flow)
5. [Routing Table](#routing-table)
6. [Authentication Middleware](#authentication-middleware)
7. [Observability](#observability)
8. [Configuration](#configuration)
9. [Tests](#tests)

---

## Functional Requirements

- It should be able to route all inbound HTTP requests to the correct downstream microservice
- I am expecting it to enforce JWT authentication on all non-`/auth` routes
- I am expecting to also in turn detect when a downstream is down, by using the circuit breaker and adjusting to the appropriate state when needed.
- It should be able to forward request headers (Authorization, Cookie, Paystack signature, verif-hash) to downstream services
- Stream response bodies back to the client without buffering
- It shoud adequately block known malicious probe paths (WordPress scanners, phpMyAdmin, etc.)
- I am expecting to have or expose the right `/health` and `/metrics` endpoint for Prometheus
- Lastly it should support all HTTP methods: GET, POST, PUT, DELETE

## Non-Functional Requirements

- **Latency overhead:** < 5ms added per proxied request (P95)
- **Availability:** Single point of failure in local dev; I will consider horizontal scalaing behind a load balancer in production
- **Security:** All CORS origins explicitly whitelisted; no wildcard origins
- **Observability:** Distributed trace context injected via OTEL; Prometheus metrics for request count and latency per route
- **Resilience:** Downstream service errors surfaced cleanly with original status codes; stream errors handled without crashing the gateway

---

## Architecture & Design Decisions
For tradeoffs and design choices please refer to the documentation link attached here: [→ Tradeoff Docs](../tradeoffs/apigateway.tradeoffs.md) 


## Request Flow

```
Client > [Helmet + CORS] > [Request logger] > [Malicious probe filter (blocks all probe)] > 
[Route: /:service/*]
1. service === 'auth' > skip auth middleware
  ├─ path === 'health'  → skip auth middleware
  └─ all others         → authenticate() middleware (JWT verify)
                              >  (if valid)
                         > [Proxy handler]
                              >
                         axios({ method, url, data, headers, responseType: 'stream' })
                             >
                         response.data.pipe(res)
```

---

## Routing Table

The routing table for each microservices are carefully defined in the `constants.ts` file:

| Route Prefix | Downstream Service | Port |
|---|---|---|
| `/auth/*` | Authentication | 4001 |
| `/audit/*` | Audit | 4002 |
| `/products/*` | Products | 4003 |
| `/payment/*` | Payment | 4004 |
| `/categories/*` | Categories | 4005 |
| `/notification/*` | Notification | 4006 |
| `/stores/*` | Stores | 4007 |
| `/inventory/*` | Inventory | 4008 |
| `/cart/*` | Cart | 4009 |
| `/tenant/*` | Tenant | 4010 |
| `/review/*` | Review | 4011 |
| `/orders/*` | Orders | 4012 |
| `/color/*` | Color | 4013 |
| `/view/*` | View | 4014 |
| `/size/*` | Size | 4015 |
---

## Authentication Middleware

```typescript
// middleware/authentication.ts
// Verifies JWT from Authorization header or 'jwt' cookie.
// Attaches decoded payload to req.user.
// Returns 401 if token is missing or invalid.
// Returns 403 if token is valid but lacks required permissions.
```

The middleware reads the token from:
1. `Authorization: Bearer <token>` header
2. `jwt` cookie (for browser clients)

On failure, returns:
```json
{ "status": "error", "error": "Unauthorized" }
```

---

## Observability

### OpenTelemetry (`utils/otel.ts`)

- Initialized before all other imports via `import "./utils/otel"` at the top of `server.ts`
- Exports traces to Tempo at `http://tempo:4318/v1/traces`
- Auto-instruments: HTTP, Express, MongoDB driver, Redis client
- Winston log hook injects `trace_id`, `span_id`, `trace_flags` into every log line
- `@opentelemetry/instrumentation-fs` disabled generates excessive noise

**Critical:** OTEL SDK must be imported before Express and any other instrumented library. Importing it after means spans for those libraries will not be captured.

### Prometheus (`utils/metrics.ts`)

Two custom metrics beyond default Node.js metrics:

| Metric | Type | Labels |
|--------|------|--------|
| `Api_Gateway_HTTP_request_duration` | Histogram | method, route, status_code, success |
| `Api_Gateway_http_request_total` | Counter | method, route, status_code, success |

Scraped by Prometheus at `GET /metrics`.

### Logging (`utils/logger.ts`)

Winston structured JSON. All logs carry `service: "api_gateway_service"` and a timestamp. Console transport active in all environments; Promtail ships logs from Docker container stdout to Loki.

---

## Configuration

### Environment Variables

```bash
PORT=8000
NODE_ENV=development

AUTH_SERVICE_URL=http://authentication:4001
PRODUCT_SERVICE_URL=http://products:4003
AUDIT_SERVICE_URL=http://audit:4002
PAYMENT_SERVICE_URL=http://payment:4004
CATEGORIES_SERVICE_URL=http://categories:4005
NOTIFICATION_SERVICE_URL=http://notification:4006
STORES_SERVICE_URL=http://stores:4007
INVENTORY_SERVICE_URL=http://inventory:4008
CART_SERVICE_URL=http://cart:4009
TENANT_SERVICE_URL=http://tenant:4010
REVIEW_SERVICE_URL=http://review:4011
ORDERS_SERVICE_URL=http://orders:4012
COLOR_SERVICE_URL=http://color:4013
VIEW_SERVICE_URL=http://view:4014
SIZE_SERVICE_URL=http://size:4015

WEB_ORIGIN=http://localhost:3000
WEB_ORIGIN2=http://localhost:3001
WEB_ORIGIN3=https://yourdomain.com

JWT_SECRET=<your-secret>
```
---

## Tests

See [`../../tests/api-gateway/`](../../tests/api-gateway/) for:

- `unit/proxy.test.ts` :routing logic, header forwarding, probe blocking
- `unit/auth-middleware.test.ts` :JWT verification, bypass rules
- `integration/gateway.integration.test.ts` :full HTTP flow with mocked services