# API Gateway Service

Central entry point for SellEasi's microservices architecture. Handles request routing, authentication, security, and observability for all downstream services.

## Features

- **Dynamic Service Routing** - Routes requests to 15+ microservices (auth, products, orders, payments, inventory, etc.)
- **Conditional Authentication** - JWT validation for protected routes, bypasses auth service
- **Security Hardening** - Helmet.js, CORS configuration, malicious probe blocking (WordPress, phpMyAdmin)
- **Observability Stack**
  - OpenTelemetry traces exported to Tempo
  - Prometheus metrics (request duration, throughput, error rates)
  - Structured logging with Winston
- **Streaming Responses** - Efficient proxying without buffering large payloads
- **Health Checks** - `/health` and `/metrics` endpoints for monitoring

## Architecture
```
Client Request → API Gateway → Authentication Middleware → Service Proxy → Downstream Service
                      ↓
                 OTEL Traces
                 Prometheus Metrics
                 Winston Logs
```

## Endpoints

- `GET /health` - Service health check
- `GET /metrics` - Prometheus metrics scraping
- `/:service/*` - Dynamic routing to microservices (e.g., `/auth/login`, `/products/123`)

## Environment Variables
```bash
PORT=8000
WEB_ORIGIN=http://localhost:3000
WEB_ORIGIN2=http://localhost:3001
WEB_ORIGIN3=http://localhost:3002
NODE_ENV=production

# Service URLs (internal Docker network)
AUTH_SERVICE_URL=http://auth:4001
PRODUCTS_SERVICE_URL=http://products:4002
ORDERS_SERVICE_URL=http://orders:4003
```

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Proxy**: Axios with streaming
- **Observability**: OpenTelemetry, Prometheus, Winston
- **Security**: Helmet, CORS, Cookie Parser

## Pending Features

- [ ] Circuit Breaker (Opossum) for fault tolerance
- [ ] Rate Limiting (Redis-backed) per tenant/IP
- [ ] Service Discovery (Consul integration)
- [ ] Request Retry with exponential backoff
- [ ] Bulkhead pattern for concurrency limits
- [ ] Distributed tracing context propagation

## Getting Started
```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Run in production
npm start

# Docker
docker build -t selleasi-gateway .
docker run -p 8000:8000 selleasi-gateway
```

## Metrics Collected

- `api_gateway_http_request_total` - Total requests per service
- `Api_Gateway_HTTP_request_duration` - Request latency histogram
- Default Node.js metrics (memory, CPU, event loop lag)

## Security Notes

- All non-auth requests require valid JWT tokens
- CORS restricted to whitelisted origins
- Automatic blocking of common exploit paths
- Cookie-based session support for stateful clients

## Monitoring

View metrics in Grafana:
- Request throughput by service
- P95/P99 latency per route
- Error rate trends
- Service availability

Access Loki logs via Grafana for request tracing and error debugging.