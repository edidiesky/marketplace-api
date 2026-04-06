# Auth Service

I built the auth service to handle every identity concern on the platform: multi-step registration, login with mandatory 2FA, JWT issuance and rotation, password reset, role-based access control, and tenant metadata sync via Kafka. Every other service trusts the JWT this service issues. Nothing else in the system issues tokens.

**Port:** `4001`
**Database:** MongoDB (`auth_db`)
**Cache:** Redis (OTP tokens, onboarding state, refresh tokens, blocklist)
**Kafka:** Producer and consumer (choreography-based saga participant)

---

## Table of Contents

1. [Functional Requirements](#functional-requirements)
2. [Non-Functional Requirements](#non-functional-requirements)
3. [Capacity Estimation](#capacity-estimation)
4. [API Reference](#api-reference)
5. [Data Model](#data-model)
6. [Data Flows](#data-flows)
7. [Kafka Topics](#kafka-topics)
8. [OTEL Integration](#otel-integration)
9. [Architecture Decisions](#architecture-decisions)
10. [Tests](#tests)

---

## Functional Requirements

- I support multi-step email onboarding with magic-link verification across four sequential steps
- I hash all passwords with bcrypt at cost factor 12
- I enforce 2FA on every login via a 6-digit OTP sent by email or SMS
- I issue a short-lived stateless JWT access token (15 minutes) and a long-lived stateful refresh token (7 days) with rotation on every use
- I support role creation, assignment, and revocation with hierarchical level enforcement
- I support password reset via a secure single-use token sent by email
- I sync tenant metadata (tenantId, plan, status) onto the User document via Kafka when the tenant provisioning saga completes
- I roll back (delete) the User document if the tenant provisioning saga fails downstream
- I block login for sellers if `tenantStatus` is not `ACTIVE`

---

## Non-Functional Requirements

- Authentication latency: P95 < 100ms excluding bcrypt hash time (~80ms at cost 12)
- 2FA token TTL: 15 minutes (900 seconds), stored in Redis
- Onboarding session TTL: configurable via `ONBOARDING_EXPIRATION_SEC`
- Refresh token TTL: 7 days, configurable via `BASE_EXPIRATION_SEC`
- Availability: the app layer is stateless. Redis and MongoDB must be highly available for this service to function
- Idempotency: login and 2FA verification are idempotent via Redis-backed token checks

---

## Capacity Estimation

Baseline assumptions: 100k registered users, 10k DAU, peak 500 logins per minute.

| Operation | Frequency | DB hit | Cache hit |
|---|---|---|---|
| Login | 500/min peak | Always (findByEmail) | OTP from Redis |
| 2FA verify | 500/min peak | Always (User lookup) | Token from Redis |
| Token refresh | 1k/min peak | None | 100% Redis |
| Register | 50/min peak | Always | None |

**Redis memory footprint:**

| Key space | Active entries | Size per entry | Total |
|---|---|---|---|
| OTP tokens (`2fa:<email>`) | 500 | ~200 bytes | ~100 KB |
| Onboarding sessions (`onboarding:<email>`) | 50 | ~500 bytes | ~25 KB |
| Refresh tokens (`refresh:<userId>`) | 10k | ~200 bytes | ~2 MB |
| Blocklist (`blocklist:<userId>`) | Low (post-logout only) | ~50 bytes | Negligible |

Total Redis footprint: ~2.1 MB. No memory concern at this scale.

**MongoDB write throughput:**
Registrations at 50 per minute is less than 1 write per second. Trivially handled by a single replica set.

---

## API Reference

All routes are prefixed `/api/v1/auth`. Via the gateway they are accessed as `/auth/api/v1/auth`.

Full request/response shapes, error codes, and cookie documentation are in [`api/contracts.md`](./api/contracts.md).

### Onboarding (4 steps, sequential)

Each step depends on the previous one completing. I track progress in Redis under `onboarding:<email>`. If the key expires or a step is skipped, the flow must restart from step 1.

```
POST /api/v1/auth/verify-email          Step 1: submit email, receive magic link
GET  /api/v1/auth/email/confirmation    Step 2: verify magic link token
POST /api/v1/auth/verify-password       Step 3: set password
POST /api/v1/auth/signup                Step 4: complete profile, create user
```

### Session management

```
POST /api/v1/auth/login                 Validate credentials, send OTP
POST /api/v1/auth/verify-otp            Validate OTP, issue JWT + refresh token
POST /api/v1/auth/refresh-token         Rotate refresh token, issue new access token
POST /api/v1/auth/logout                Invalidate tokens, write blocklist key
```

### Password management

```
POST /api/v1/auth/request-reset         Send reset link (always 200, anti-enumeration)
POST /api/v1/auth/password-reset        Reset password with token from email
POST /api/v1/auth/password-change       Change password while authenticated
```

### RBAC

All role endpoints require a valid Bearer JWT. Role operations are restricted by the caller's `roleLevel`. I do not allow assigning or revoking a role at an equal or higher level than the caller's own.

| Method | Path | Permission required |
|---|---|---|
| POST | `/api/v1/auth/roles` | `SUPER_ADMIN` or `EXECUTIVE` |
| POST | `/api/v1/auth/roles/assign-role` | `MANAGE_ROLES` |
| DELETE | `/api/v1/auth/roles/revoke-role` | `MANAGE_ROLES` |
| PUT | `/api/v1/auth/roles/update-role` | `MANAGE_ROLES` |
| GET | `/api/v1/auth/roles/user-roles/:userId` | `READ_USER` |
| GET | `/api/v1/auth/roles/available-roles` | `MANAGE_ROLES` |

---

## Data Model

### User collection

```typescript
{
  _id: ObjectId,
  email: string,
  phone: string,
  passwordHash: string,
  userType: 'SELLERS' | 'ADMIN' | 'INVESTORS' | 'CUSTOMER',
  firstName?: string,
  lastName?: string,
  profileImage?: string,
  gender?: 'Male' | 'Female',
  address?: string,
  isEmailVerified: boolean,
  falseIdentificationFlag: boolean,
  lastActiveAt: Date,

  tenantId?: string,
  tenantType?: TenantType,
  tenantStatus: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'DELETED',
  tenantPlan: 'FREE' | 'PRO' | 'ENTERPRISE',
  trialEndsAt?: Date,
  currentPeriodEndsAt?: Date,
  cancelAtPeriodEnd: boolean,

  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**

```typescript
{ email: 1 }                          // unique, primary lookup
{ createdAt: -1, userType: 1 }        // admin user listing
{ createdAt: -1, firstName: 1 }       // name search
{ createdAt: -1, email: 1 }           // time-ranged email queries
```

### Role collection

```typescript
{
  _id: ObjectId,
  roleCode: string,
  roleName: string,
  level: 1 | 2 | 3 | 4,   // 1=SUPER_ADMIN, 2=EXECUTIVE, 3=HEAD, 4=MEMBER
  permissions: Permission[],
  description: string,
  parentRole?: ObjectId,
  childRoles: ObjectId[],
  isActive: boolean
}
```

### UserRole collection

```typescript
{
  userId: string,
  roleId: ObjectId,
  assignedBy: string,
  assignedAt: Date,
  effectiveFrom: Date,
  effectiveTo?: Date,
  isActive: boolean,
  scope: object,
  reason: string
}
```

---

## Data Flows

### Registration saga

```
Client > POST /api/v1/auth/signup
  MongoDB transaction:
    create User { tenantStatus: DRAFT }
  Kafka > USER_ONBOARDING_COMPLETED_TOPIC { ownerId, ownerEmail, tenantType, billingPlan }
  Redis  > DEL onboarding:<email>
  Return 201

Tenant service (consumer):
  Create Tenant document
  Kafka > TENANT_ONBOARDING_COMPLETED_TOPIC { tenantId, ownerId, plan, status: ACTIVE }

Auth service (consumer: TENANT_ONBOARDING_COMPLETED_TOPIC):
  User.findOneAndUpdate({ _id: ownerId }, { tenantId, tenantPlan, tenantStatus: ACTIVE })
  Kafka > NOTIFICATION_TENANT_ONBOARDING_COMPLETED_TOPIC

Compensation (if tenant creation fails):
  Tenant service > Kafka: USER_ROLLBACK_TOPIC { email }
  Auth consumer  > User.findOneAndDelete({ email })
```

### Login and 2FA flow

```
POST /api/v1/auth/login
  MongoDB > findByEmail(email)
  bcrypt.compare(password, hash)         ~80ms at cost 12
  if tenantStatus !== ACTIVE > 403
  Redis  > SETEX 2fa:<email> 900 { otp, expiresAt }
  Kafka  > NOTIFICATION_AUTHENTICATION_2FA_TOPIC
  Return 200 { message: "OTP sent" }

POST /api/v1/auth/verify-otp
  MongoDB > findByEmail(email)
  Redis   > GET 2fa:<email>
  validate OTP and expiry
  if invalid > 401
  sign JWT access token (15min)
  Redis  > SETEX refresh:<userId> 7d nanoid(32)
  Redis  > DEL 2fa:<email>
  MongoDB > updateOne lastActiveAt
  Return 200 { accessToken, refreshToken, user }
```

### Token refresh

```
POST /api/v1/auth/refresh-token
  Redis > GET refresh:<userId>
  if not found or mismatch > 401
  Redis pipeline:
    DEL refresh:<userId>
    SETEX refresh:<userId> 7d newToken
  Return 200 { accessToken, refreshToken }
```

### Logout

```
POST /api/v1/auth/logout
  Redis > DEL refresh:<userId>
  Redis > SETEX blocklist:<userId> <remaining_access_ttl> 1
  Return 200
```

### authenticate middleware (every protected route)

```
Verify JWT signature
  if invalid or expired > 401
Redis > GET blocklist:<userId>
  if found > 401
Inject req.user from JWT payload
next()
```

---

## Kafka Topics

### Produces

| Topic | Trigger | Key payload fields |
|---|---|---|
| `USER_ONBOARDING_COMPLETED_TOPIC` | `POST /signup` (non-customer) | `ownerId`, `ownerEmail`, `ownerName`, `tenantType`, `billingPlan` |
| `NOTIFICATION_ONBOARDING_EMAIL_CONFIRMATION_TOPIC` | Step 1 of onboarding | `email`, `firstName`, `lastName`, `verification_url` |
| `NOTIFICATION_AUTHENTICATION_2FA_TOPIC` | `POST /login` success | `otp`, `phone`, `email`, `fullName` |
| `NOTIFICATION_TENANT_ONBOARDING_COMPLETED_TOPIC` | Tenant saga callback processed | `userId`, `tenantId` |
| `Authentication.dlq` | Consumer error after max retries | Original message + error metadata |

### Consumes

| Topic | Published by | Action |
|---|---|---|
| `TENANT_ONBOARDING_COMPLETED_TOPIC` | Tenant service | Patch User with `tenantId`, `tenantPlan`, `tenantStatus: ACTIVE` |
| `USER_ROLLBACK_TOPIC` | Tenant service | Delete User by email (saga compensation) |

### Consumer configuration

```typescript
groupId: 'Authentication-group'
autoCommit: false
partitionsConsumedConcurrently: 3
sessionTimeout: 30000
heartbeatInterval: 3000
maxBytesPerPartition: 1048576  // 1MB
```

I use manual commit (`autoCommit: false`) so a message is only acknowledged after my handler completes successfully. If the handler throws, I retry with exponential backoff. After `MAX_RETRIES` the message goes to the DLQ and I commit the offset to avoid blocking the partition.

---

## OTEL Integration

I import `./utils/otel` as the first line of `server.ts`, before Express and before Mongoose. The SDK must initialise before any instrumented library loads or spans will be missed.

```typescript
// server.ts — otel must be the first import
import "./utils/otel";
import express from "express";
```

The SDK auto-instruments HTTP requests, Mongoose operations, Redis commands, and Kafka producer/consumer calls. Winston instrumentation reads the active span and injects `trace_id`, `span_id`, and `trace_flags` into every log record:

```json
{
  "message": "User signed in successfully using 2FA",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "trace_flags": "01",
  "service": "auth-service"
}
```

This gives me log-to-trace correlation in Grafana. Clicking a `trace_id` in the Loki log explorer jumps directly to the Tempo trace for that request.

```typescript
// utils/otel.ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

if (process.env.NODE_ENV !== "production") {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://tempo:4318/v1/traces",
});

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME || "auth-service",
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
    new WinstonInstrumentation({
      logHook: (span, record) => {
        record["trace_id"] = span.spanContext().traceId;
        record["span_id"] = span.spanContext().spanId;
        record["trace_flags"] = `0${span.spanContext().traceFlags.toString(16)}`;
      },
    }),
  ],
});

sdk.start();

process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("Auth service tracing shut down"))
    .catch((err) => console.error("Error shutting down tracing", err))
    .finally(() => process.exit(0));
});

export default sdk;
```

---

## Architecture Decisions

I document every design decision I made for this service as ADRs in
[`architecture/decision/`](./architecture/decision/). Each one covers the context I was in, the decision I made, and what I gave up.

| ADR | Decision summary |
|---|---|
| ADR-AUTH-001 | Hybrid JWT: stateless access token + stateful refresh token |
| ADR-AUTH-002 | OTP 2FA on every login via email or SMS |
| ADR-AUTH-003 | Refresh token rotation on every use |
| ADR-AUTH-004 | Logout blocklist via Redis key with remaining TTL |
| ADR-AUTH-005 | Four-step registration with magic link email verification |
| ADR-AUTH-006 | Block login if tenant status is not ACTIVE |
| ADR-AUTH-007 | tenantId always injected from JWT, never from request |
| ADR-AUTH-008 | Permissions array and roleLevel embedded in JWT payload |

---

## Tests

I organise tests by tier. The unit suite covers service and repository logic in isolation. The integration suite covers controllers end-to-end through real middleware against a real MongoDB instance.

```
tests/authentication/
  unit/
    auth.service.test.ts        business logic: token generation, OTP validation, bcrypt
    user.repository.test.ts     repository methods with mocked Mongoose
  integration/
    auth.integration.test.ts    full HTTP flow: onboarding, login, 2FA, refresh, logout
  k6/
    auth-load.js                login + 2FA load test, ramp 10 to 100 VUs, p95 < 100ms
```

Run unit tests:

```bash
cd auth
npm test
npm run test:coverage
```

Run integration tests (requires Docker Compose stack running):

```bash
npm run test:integration
```

Run load test:

```bash
cd _infrastructure/k6
k6 run auth-load.js
```