# Authentication Service
The authentication service is responsible for ahndling authentication deemed featuwres like registration, login, 2fa, password reset request, and change
**Port:** `4001`  
**Database:** MongoDB (`auth_db`)  
**Cache:** Redis (2FA tokens, onboarding state, user cache, refresh tokens)  
**Kafka:** Producer + Consumer (choreography-based saga participant)

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
9. [Tradeoffs](#tradeoffs)
10. [Tests](#tests)

---

## Functional Requirements

- The user should be able to carryout multi-step email onboarding with magic-link email verification
- The user should have a secure password hashing (bcrypt, cost factor 12)
- The user should be able to opt in for 2FA via email/SMS OTP on every login
- The user authorization, and authentication shoild be via JWT access token + refresh token with rotation
- The user should have role creation, assignment, revocation with hierarchical level enforcement
- Password reset via secure token (email flow)
- Tenant metadata sync via Kafka (tenantId, plan, status written to User document)
- User rollback (soft-delete) on downstream saga failure
- User profile CRUD with Redis cache invalidation

## Non-Functional Requirements

- **Authentication latency:** P95 < 100ms (excluding bcrypt hash time ~80ms at cost 12)
- **2FA token TTL:** 15 minutes (900 seconds)
- **Onboarding session TTL:** Configurable via `ONBOARDING_EXPIRATION_SEC`
- **Refresh token TTL:** `BASE_EXPIRATION_SEC` (set in constants — recommended 7 days)
- **Availability:** Stateless app layer; Redis + MongoDB must be HA for the service to function
- **Idempotency:** Login and 2FA verification are idempotent via Redis-backed token checks

---

## Capacity Estimation

Baseline assumptions: 100k registered users, 10k DAU, peak 500 logins/min.

| Operation | Frequency | DB Hit | Cache Hit |
|-----------|-----------|--------|-----------|
| Login | 500/min peak | Fallback only | ~90% warm cache |
| 2FA verify | 500/min peak | Always (User lookup) | Token from Redis |
| Token refresh | 1k/min peak | None | 100% Redis |
| Register | 50/min peak | Always | — |

**Redis memory footprint (2FA + sessions):**
- 2FA tokens: 500 active × 200 bytes = ~100KB
- Onboarding sessions: 50 active × 500 bytes = ~25KB
- User cache: 10k entries × 1KB = ~10MB
- Refresh tokens: 10k active × 200 bytes = ~2MB

Total Redis footprint: ~12MB — negligible.

**MongoDB write throughput:**
- Registrations: 50/min = <1 write/sec — trivially handled by a single replica set.

---

## API Reference

All routes prefixed with `/api/v1/auth` (accessed via gateway as `/auth/api/v1/auth`).

### Onboarding Flow (3 steps)

```
POST /api/v1/auth/email/confirmation     Step 1: Send magic link
GET  /api/v1/auth/email/confirmation     Step 2: Verify email token (query: email, token)
POST /api/v1/auth/password/confirmation  Step 3: Set password
POST /api/v1/auth/signup                 Step 4: Complete registration
```

#### POST /api/v1/auth/email/confirmation
```json
Request:  { "email": "string", "firstName": "string", "lastName": "string", "notificationId": "string" }
Response: { "success": true, "message": "Verification email sent..." }
```
Side effects: Saves `{ email, firstName, lastName, token, expiresAt, step: 'email' }` to Redis key `onboarding:<email>`. Fires `NOTIFICATION_ONBOARDING_EMAIL_CONFIRMATION_TOPIC` to Kafka.

#### GET /api/v1/auth/email/confirmation?token=&email=
```json
Response: { "success": true, "nextStep": "password" }
```
Validates token against Redis. Does not mutate state.

#### POST /api/v1/auth/password/confirmation
```json
Request:  { "email": "string", "password": "string" }
Response: { "success": true, "data": { "email": "..." } }
```
Bcrypt-hashes password (cost 12) and updates Redis onboarding state.

#### POST /api/v1/auth/signup
```json
Request:  { "email": "string", "userType": "SELLERS|CUSTOMER|ADMIN|INVESTORS", "phone": "string", "address": "string", "gender": "Male|Female", "plan": "FREE|PRO|ENTERPRISE", "tenantType": "string" }
Response: { "success": true, "data": "<userId>" }
```
Runs inside a MongoDB session (transaction). Creates User document. For non-CUSTOMER users, fires `USER_ONBOARDING_COMPLETED_TOPIC` * Tenant service.

---

### Authentication

#### POST /api/v1/auth/login
```json
Request:  { "email": "string", "password": "string", "idempotencyKey": "string (optional)" }
Response: { "message": "2FA token sent...", "email": "string" }
```
Validates password, generates 6-character 2FA OTP, stores in Redis `2fa:<email>` with 15-min TTL, fires `NOTIFICATION_AUTHENTICATION_2FA_TOPIC`.

#### POST /api/v1/auth/verify-2fa
```json
Request:  { "email": "string", "otp": "string" }
Response: { "accessToken": "string", "refreshToken": "string", "user": { ... } }
```
Validates OTP against Redis. On success: generates JWT pair, updates `lastActiveAt`, deletes `2fa:<email>` key.

#### POST /api/v1/auth/refresh-token
```json
Request:  { "refreshToken": "string" }
Response: { "accessToken": "string", "refreshToken": "string" }
```
Full rotation: old refresh token is deleted, new pair issued.

#### POST /api/v1/auth/request-reset
```json
Request:  { "email": "string" }
Response: { "message": "Reset link sent..." }
```

#### POST /api/v1/auth/reset-password
```json
Request:  { "token": "string", "newPassword": "string" }
Response: { "message": "Password reset successfully" }
```

#### POST /api/v1/auth/logout
Clears `jwt` cookie.

---

### RBAC

All role endpoints require authenticated JWT.

| Method | Path | Permission Required |
|--------|------|---------------------|
| POST | `/roles` | SUPER_ADMIN or EXECUTIVE |
| POST | `/roles/assign-role` | MANAGE_ROLES |
| DELETE | `/roles/revoke-role` | MANAGE_ROLES |
| PUT | `/roles/update-role` | MANAGE_ROLES |
| GET | `/roles/user-roles/:userId` | READ_USER |
| GET | `/roles/available-roles` | MANAGE_ROLES |

Role levels are hierarchical, you cannot assign/revoke/update a role at an equal or higher level than your own.

---

## Data Model

### User Collection

```typescript
{
  _id: ObjectId,
  email: string,       
  phone: string,     
  passwordHash: string,
  userType: enum,          // SELLERS | ADMIN | INVESTORS | CUSTOMER
  firstName?: string,
  lastName?: string,
  profileImage?: string,
  gender?: enum,
  address?: string,
  isEmailVerified: boolean,
  falseIdentificationFlag: boolean,
  lastActiveAt: Date,

  // Tenant metadata (mostly written by Kafka consumer)
  tenantId?: string,
  tenantType?: TenantType,
  tenantStatus: TenantStatus,   // DRAFT | ACTIVE | SUSPENDED | DELETED
  tenantPlan: BillingPlan,      // FREE | PRO | ENTERPRISE
  trialEndsAt?: Date,
  currentPeriodEndsAt?: Date,
  cancelAtPeriodEnd: boolean,

  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```typescript
{ createdAt: -1, userType: 1 }
{ createdAt: -1, firstName: 1 }
{ createdAt: -1, email: 1 }
{ email: 1 }  
```

### Role Collection

```typescript
{
  _id: ObjectId,
  roleCode: string,      
  roleName: string,
  level: RoleLevel,       // 1=SUPER_ADMIN, 2=EXECUTIVE, 3=HEAD, 4=MEMBER
  permissions: Permission[],
  description: string,
  parentRole?: ObjectId,
  childRoles: ObjectId[],
  isActive: boolean
}
```

### UserRole Collection (join table)

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

### Registration Saga

```
Client * POST /api/v1/auth/signup
  * MongoDB transaction: create User (status: DRAFT)
  * Kafka: USER_ONBOARDING_COMPLETED_TOPIC { ownerId, ownerEmail, tenantType, billingPlan }
  * Redis: delete onboarding:<email>
  * Return 201

Tenant Service (consumer):
  * Create Tenant document
  * Kafka: TENANT_ONBOARDING_COMPLETED_TOPIC { tenantId, ownerId, plan, status: ACTIVE }

Auth Service (consumer — TENANT_ONBOARDING_COMPLETED_TOPIC):
  * User.findOneAndUpdate({ _id: ownerId }, { tenantId, tenantPlan, tenantStatus: ACTIVE })
  * Kafka: NOTIFICATION_TENANT_ONBOARDING_COMPLETED_TOPIC

Compensation (if Tenant creation fails):
  * Tenant: Kafka: USER_ROLLBACK_TOPIC { email }
  * Auth consumer: User.findOneAndDelete({ email })
```

### Login + 2FA Flow

```
POST /api/v1/auth/login
  * Redis GET user:<email>  (cache hit: ~90%)
  * bcrypt.compare(password, hash)  (~80ms)
  * Generate OTP (6-char alphanumeric)
  * Redis SETEX 2fa:<email> 900 { token, expiresAt }
  * Kafka: NOTIFICATION_AUTHENTICATION_2FA_TOPIC
  * Return 200

POST /api/v1/auth/verify-2fa
  * MongoDB: User.findOne({ email }) 
  * Redis GET 2fa:<email>
  * Validate OTP + expiry
  * generateToken() * JWT access (15min) + refresh (7d)
  * Redis SETEX refresh:<token> BASE_EXPIRATION_SEC { email, userType, name }
  * Redis DEL 2fa:<email>
  * User.updateOne lastActiveAt
  * Return { accessToken, refreshToken, user }
```

---

## Kafka Topics

### Produces

| Topic | Trigger | Payload |
|-------|---------|---------|
| `NOTIFICATION_ONBOARDING_EMAIL_CONFIRMATION_TOPIC` | Email step | `{ email, firstName, lastName, verification_url }` |
| `USER_ONBOARDING_COMPLETED_TOPIC` | Signup complete (non-customer) | `{ ownerId, ownerEmail, ownerName, type, billingPlan }` |
| `NOTIFICATION_AUTHENTICATION_2FA_TOPIC` | Login | `{ token, phone, email, fullName, message }` |
| `Authentication.dlq` | Consumer error | Original message + error metadata |

### Consumes

| Topic | Handler | Action |
|-------|---------|--------|
| `TENANT_ONBOARDING_COMPLETED_TOPIC` | `AuthenticationTopic` | Update User with tenantId, plan, status |
| `USER_ROLLBACK_TOPIC` | `AuthenticationTopic` | Delete User by email (saga compensation) |

### Consumer Configuration

```typescript
groupId: 'Authentication-group'
autoCommit: false   
partitionsConsumedConcurrently: 3
sessionTimeout: 30000
heartbeatInterval: 3000  
maxBytesPerPartition: 1MB
```

Manual commit ensures messages are not acknowledged until processing completes. Failed messages go to DLQ, then the offset is committed to prevent infinite reprocessing.

---

## OTEL Integration

Import `"./utils/otel"` as the **first line** of `server.ts` (before Express, before Mongoose):

```typescript
// server.ts: Please always add it at the top of the server.ts file
import "./utils/otel";
import express from "express";
// ...
```

The OTEL SDK auto-instruments:
- HTTP incoming/outgoing requests * spans
- Mongoose operations * spans with db.statement
- Redis commands * spans
- Kafka producer/consumer * spans

Winston instrumentation injects trace context into every log:
```json
{
  "message": "User signed in successfully using 2FA",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "service": "auth_service"
}
```

This basically enables log-to-trace correlation in Grafana: click a log line * jump to the associated Tempo trace.

### `utils/otel.ts` (full implementation)

```typescript
import "./utils/otel";
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
  serviceName: "auth-service",
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
    new WinstonInstrumentation({
      logHook: (span, record) => {
        record["trace_id"] = span.spanContext().traceId;
        record["trace_flags"] = `0${span.spanContext().traceFlags.toString(16)}`;
        record["span_id"] = span.spanContext().spanId;
      },
    }),
  ],
});

sdk.start();

process.on("SIGTERM", () => {
  sdk.shutdown()
    .then(() => console.log("Auth service tracing terminated"))
    .catch((error) => console.error("Error terminating tracing", error))
    .finally(() => process.exit(0));
});

export default sdk;
```

---

## Tradeoffs
For tradeoffs and design choices please refer to the documentation link attached here: [→ Tradeoff Docs](../tradeoffs/auth.tradeoffs.md) 

## Tests

See [`../../tests/authentication/`](../../tests/authentication/) for:

- `unit/auth.controller.test.ts` — handler logic with mocked DB and Redis
- `unit/user.service.test.ts` — service layer with mocked Mongoose
- `integration/auth.integration.test.ts` — full HTTP flow with mongodb-memory-server
- `../../tests/k6/auth-load.js` — login + 2FA k6 load test