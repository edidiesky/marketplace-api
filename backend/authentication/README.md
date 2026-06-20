# authentication-service

Owns user identity lifecycle: registration (3-step onboarding), session management (2FA-gated JWT issuance), token refresh/revocation, and password operations. Is the sole issuer of JWTs consumed by every other service.

## Key facts

| Property       | Value                                      |
|----------------|--------------------------------------------|
| Port           | 4001                                       |
| Container      | `selleazy_authentication`                  |
| Database       | MongoDB (`SELLEASI_AUTH_API` database)     |
| Cache          | Redis (session state, 2FA tokens, blocklist, permission cache) |
| Broker         | RabbitMQ                                   |
| Env files      | `.env` (root) + `backend/authentication/.env` |

## Inbound traffic

**Public (no auth required):**
All routes under `/api/v1/auth` except `/password-change` are unauthenticated by design. They are rate-limited at the gateway layer, not here.

**Authenticated:**
`POST /api/v1/auth/password-change` requires a valid Bearer JWT (`authenticate` middleware).

**Internal:**
None. This service does not expose internal-only routes.

## Outbound

**RabbitMQ publishes** (exchange `selleasi.authentication`, all persistent):

| Routing key                                       | Trigger                           |
|---------------------------------------------------|-----------------------------------|
| `user.onboarding.completed`                       | Non-customer user completes signup |
| `notification.onboarding.email.confirmation`      | Onboarding step 1 initiated       |
| `notification.authentication.2fa`                 | Login credential check passes     |
| `notification.authentication.reset.password`      | Password reset requested          |

**RabbitMQ consumes:**

| Queue                                              | Routing key expected                   | Handler                        |
|----------------------------------------------------|----------------------------------------|--------------------------------|
| `selleasi.authentication.user.onboarding.queue`   | `organization.onboarding.completed`    | Activates user status          |
| `selleasi.authentication.user.rollback.queue`     | `organization.onboarding.failed`       | Rolls back user on org failure |

**Outbound HTTP:** None. All cross-service communication is via RabbitMQ.

## API routes

| Prefix          | Route file                             | Note                            |
|-----------------|----------------------------------------|---------------------------------|
| `/api/v1/auth`  | `src/domains/auth/auth.routes.ts`      | All auth endpoints              |
| `/health`       | `src/app.ts`                           | Shallow - returns 200 only      |
| `/metrics`      | `src/app.ts`                           | Prometheus. No auth guard.      |
| `/openapi.json` | `src/app.ts`                           | Swagger spec. No auth guard.    |
| `/api-docs`     | `src/app.ts`                           | Swagger UI. No auth guard.      |

See [API Contracts](./API_CONTRACTS.md) for full request/response shapes.

## Environment variables

| Variable             | Purpose                                                     | Notes                                         |
|----------------------|-------------------------------------------------------------|-----------------------------------------------|
| `DATABASE_URL`       | MongoDB connection string                                   | Required. Crashes on missing.                 |
| `REDIS_HOST`         | Redis host                                                  | Defaults to `"redis"`                         |
| `REDIS_PORT`         | Redis port                                                  | Defaults to `6379`                            |
| `REDIS_PASSWORD`     | Redis auth password                                         | Required in practice.                         |
| `JWT_CODE`           | HMAC secret for JWT signing and verification                | Required. No default - crashes on missing.    |
| `RABBITMQ_URL`       | AMQP connection string                                      | Required. Crashes on missing.                 |
| `WEB_ORIGIN`         | Frontend origin for CORS and email link generation          | Required. Crashes on missing.                 |
| `PORT`               | HTTP listen port                                            | Defaults to `4001`                            |
| `NODE_ENV`           | Environment flag                                            | Affects cookie `secure` flag and error detail |
| `OTEL_SERVICE_NAME`  | Service name tag in traces and logs                         | Defaults to `"authentication-service"`        |
| `OTEL_ENABLED`       | Set to `"false"` to disable OTEL                           | Defaults to enabled                           |
| `TEMPO_URL`          | OTLP trace export URL                                       | **Inconsistency:** root `.env` sets `OTEL_EXPORTER_OTLP_ENDPOINT`; this service reads `TEMPO_URL`. The root value is never consumed here. |
| `LOG_LEVEL`          | Winston log level                                           | Defaults to `"info"`                          |
| `BYPASS_2FA`         | Read in `.env` but `bypass2FAMiddleware` always calls `next()` regardless of its value | Effectively dead. |
| `BATCH_SIZE`         | Present in `.env`. No usage found in `src/`.               | Dead variable.                                |

## Tests

| Script              | What it runs                                      |
|---------------------|---------------------------------------------------|
| `test`              | Jest unit config (`jest.config.ts`)               |
| `test:unit`         | Unit tests only (`__tests__/unit/`)               |
| `test:integration`  | Integration tests (`jest.integration.config.ts`)  |
| `test:coverage`     | Unit tests with coverage report                   |

**Known issues (Phase 4):**
- `src/__tests__/integration/authentication.integration.test.ts` - needs live MongoDB and Redis; will fail in CI without the integration setup containers.
- `src/__tests__/unit/auth.repository.unit.test.ts` - confirm no import of removed `changePassword(email)` signature after the patch applied in this session.

## Operations

| Concern         | Detail                                                                 |
|-----------------|------------------------------------------------------------------------|
| Health check    | `GET /health` returns `{ status: "ok" }`. Shallow - does not check MongoDB, Redis, or RabbitMQ. |
| Metrics         | `GET /metrics` - Prometheus format. No authentication guard. Exposes internal counters to any caller that can reach port 4001. |
| Rate limiting   | None in this service. Enforced at the gateway.                        |

## Known gaps

- **Finding 2 (account enumeration):** `POST /login` returns HTTP 401 + "No account found" for unknown emails and HTTP 400 + "Invalid credentials" for wrong passwords. Different status codes and messages let an attacker enumerate valid accounts. Fix: collapse both to HTTP 401 with a single generic message. [PENDING: not yet fixed]
- **`BYPASS_2FA` env var** is read by `.env` but `bypass2FAMiddleware` unconditionally calls `next()`. The flag does nothing. Either wire it or remove it.
- **`BATCH_SIZE`** in `.env` has zero usages in `src/`. Remove.
- **`TEMPO_URL` vs `OTEL_EXPORTER_OTLP_ENDPOINT`:** root `.env` sets `OTEL_EXPORTER_OTLP_ENDPOINT`; this service reads `TEMPO_URL`. Tracing will use the hardcoded default `http://tempo:4318/v1/traces` and ignore the root `.env` value unless `TEMPO_URL` is explicitly set in the service `.env`.
- **`/metrics` unauthenticated:** exposes internal prometheus counters without any guard. Acceptable behind `127.0.0.1` binding; becomes a risk if the network boundary changes.

## Related documentation

- [API Contracts](./API_CONTRACTS.md)