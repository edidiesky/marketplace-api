# authentication-service API Contracts

## Global

### Versioning
All routes are prefixed `/api/v1`. No version negotiation header. Breaking changes require a new prefix.

### Pagination
No list endpoints exist in this service.

### Error format
```typescript
interface ErrorResponse {
  success: false;
  message: string;
  // stack present only when NODE_ENV === "development"
  stack?: string;
}
```
Confirmed from `src/middleware/error-handler.ts`.

### Success response shape
No enforced envelope. Each endpoint returns its own shape. Where applicable the shape is `{ success: true, data?: unknown, message?: string }`. Inconsistency: `POST /verify-otp` returns `{ success, accessToken, refreshToken, user }` with no `data` wrapper.

### Token model
- **Access token:** JWT, HS256, signed with `JWT_CODE`, 15-minute TTL, issuer `selleasi`, audience `selleasi-client`.
- **Payload path:** `token.user` contains `{ userId, userType, organizationId, organizationType, name }`.
- **Delivered via:** JSON body (`accessToken`) AND `jwt` HttpOnly cookie (same value).
- **Refresh token:** `nanoid(32)` opaque string. Stored as Redis key `refresh:<token>` with TTL `BASE_EXPIRATION_SEC` (7200 s). Not a JWT.
- **Blocklist:** on logout, access token remaining TTL is stored at `blocklist:<userId>`. `authenticate` middleware checks this key before allowing the request.
- **`authenticate` middleware chain:** reads token from `req.cookies.jwt` first, then `Authorization: Bearer <token>`. Verifies signature, checks blocklist, sets `req.user`.

### Role and permission model
RBAC. Roles are seeded at bootstrap by `rbacService.seedRolesAndPermissions()`. Permissions are cached in Redis at `permissions:<userId>` for 300 s.

`checkPermission(resource, action)` middleware (from `src/middleware/rbac.middleware.ts`) resolves via:
1. Redis cache lookup.
2. `UserRole` collection lookup by `userId`.
3. `RolePermission` collection lookup with `permissionId` populated.

Permission string format: `<resource>:<action>`. Wildcard: `*:*` grants all.

Logic is OR within the permission set: `resource:action` OR `resource:*` OR `*:action` OR `*:*`.

**No `checkPermission` is applied to any route in this service.** All routes are either fully public or gated only by `authenticate`.

---

## POST /api/v1/auth/onboarding/initiate

| | |
|---|---|
| Method | POST |
| Path | `/api/v1/auth/onboarding/initiate` |
| Auth | None |
| Idempotent | No |
| Rate limit | None (gateway-enforced) |
| Success | 201 |
| Emits | `notification.onboarding.email.confirmation` on `selleasi.authentication` exchange |

### Summary
Step 1 of 3-step onboarding. Validates email uniqueness, hashes password, stores state in Redis under key `onboarding:<email>` for 900 s, and fires a verification email via RabbitMQ. Does not create a user record.

### Request
```typescript
interface InitiateOnboardingRequest {
  email:           string; // valid email, lowercased
  password:        string; // min 8, max 64, must have upper+lower+digit+special
  confirmPassword: string; // validated by Joi schema but not checked against password in service layer
  notificationId?: string; // UUID, idempotency key for the email event
}
```
**Note:** `confirmPassword` is accepted by the validator schema but the service only uses `password`. Password equality check is absent server-side.

### Response
```typescript
interface InitiateOnboardingResponse {
  success: true;
  data:    null;
  message: string; // "Verification email sent to <email>. Please check your inbox."
}
```

### Errors
| Status | Trigger |
|--------|---------|
| 400    | Validation failure (Joi) |
| 409    | Email already registered |
| 500    | Redis or RabbitMQ unavailable |

### Side effects
- Writes Redis key `onboarding:<email>` (TTL 900 s) containing `{ step: "email", passwordHash, tokenObject: { token, expiresAt } }`.
- Publishes `notification.onboarding.email.confirmation` to RabbitMQ. Fire-and-forget; publish errors are not surfaced to caller.

### Idempotency
Not idempotent. Calling twice with the same email returns 409 if a user record exists; if only a Redis state exists, it overwrites the prior state, invalidating the first verification link.

---

## GET /api/v1/auth/email/confirmation

| | |
|---|---|
| Method | GET |
| Path | `/api/v1/auth/email/confirmation` |
| Auth | None |
| Idempotent | Yes |
| Rate limit | None |
| Success | 200 |
| Emits | Nothing |

### Summary
Email link target. Validates the UUID token against the stored Redis onboarding state and advances `step` to `"password"`, which gates `POST /signup`.

### Request
```typescript
interface ConfirmEmailQuery {
  token: string; // UUID
  email: string; // plain email string
}
```
Query parameters.

### Response
```typescript
interface ConfirmEmailResponse {
  success:  true;
  data:     null;
  message:  string;
  nextStep: "details";
}
```

### Errors
| Status | Trigger |
|--------|---------|
| 400    | Missing token or email query params |
| 400    | No onboarding session in Redis |
| 400    | Token mismatch |
| 400    | Token expired (> 900 s from initiation) |

### Side effects
Updates Redis onboarding state: sets `step` to `"password"`. Does not delete the `passwordHash` or `tokenObject` fields.

### Idempotency
Idempotent if called multiple times before the session expires, provided the token matches.

---

## POST /api/v1/auth/signup

| | |
|---|---|
| Method | POST |
| Path | `/api/v1/auth/signup` |
| Auth | None |
| Idempotent | No |
| Rate limit | None |
| Success | 201 |
| Emits | `user.onboarding.completed` for non-customer user types |

### Summary
Step 3 of onboarding. Requires prior email confirmation (`step === "password"` in Redis). Creates the user record in MongoDB inside a session transaction, assigns default RBAC role, publishes org onboarding event for non-customers, then deletes the Redis onboarding state.

### Request
```typescript
interface SignupRequest {
  email:     string;
  firstName: string;
  lastName:  string;
  userType:  "seller:admin" | "seller:member" | "seller:viewer" | "platform:admin" | "platform:staff" | "customer" | "investor" | "advisor" | "system";
  phone:     string; // with or without country code
  address?:  string;
  gender?:   "Male" | "Female";
}
```

### Response
```typescript
interface SignupResponse {
  success: true;
  data: {
    userId:           string;
    email:            string;
    userType:         string;
    organizationType: string;
  };
  message: "Account created successfully.";
}
```

### Errors
| Status | Trigger |
|--------|---------|
| 400    | Validation failure |
| 400    | No completed email verification in Redis (`step !== "password"`) |
| 400    | `passwordHash` missing from Redis state |
| 409    | Email already exists in database (double-submit guard inside transaction) |

### Side effects
- Creates `User` document with `status: "draft"`.
- Assigns default role permissions via `rbacService.assignDefaultRoleToUser`.
- Publishes `user.onboarding.completed` to `selleasi.authentication` exchange for non-customer user types. Customer users get no event.
- Deletes Redis key `onboarding:<email>`.

### Idempotency
Not idempotent. Second call with the same email after a successful first call hits the 409 conflict guard inside the transaction.

---

## POST /api/v1/auth/login

| | |
|---|---|
| Method | POST |
| Path | `/api/v1/auth/login` |
| Auth | None |
| Idempotent | No |
| Rate limit | None (gateway-enforced) |
| Success | 200 |
| Emits | `notification.authentication.2fa` |

### Summary
Step 1 of 2-step login. Validates credentials, generates a 6-digit OTP, stores it at Redis key `2fa:<email>` for 300 s, publishes the OTP to the notification service via RabbitMQ. Does not issue tokens.

### Request
```typescript
interface LoginRequest {
  email:           string;
  password:        string;
  idempotencyKey?: string; // UUID, passed as notificationId to the 2FA event
}
```

### Response
```typescript
interface LoginResponse {
  success: true;
  message: "A 2FA token has been sent to your registered contact.";
  email:   string;
}
```

### Errors
| Status | Trigger |
|--------|---------|
| 400    | Validation failure |
| 400    | Wrong password (`"Invalid credentials."`) |
| 401    | Email not found (`"No account found with this email."`) |
| 403    | `falseIdentificationFlag` is true on user record |

**Known gap (Finding 2):** 401 vs 400 differentiation reveals whether an email is registered. Not yet fixed.

### Side effects
- Reads user from Redis cache `user:<email>` or MongoDB, writes to cache with 7200 s TTL.
- Writes Redis key `2fa:<email>` (TTL 300 s).
- Publishes `notification.authentication.2fa` event. Fire-and-forget.

### Idempotency
Not idempotent. Each call generates a new OTP, overwriting the prior Redis entry.

---

## POST /api/v1/auth/verify-otp

| | |
|---|---|
| Method | POST |
| Path | `/api/v1/auth/verify-otp` |
| Auth | None |
| Idempotent | No |
| Rate limit | None (gateway-enforced) |
| Success | 200 |
| Emits | Nothing |

### Summary
Step 2 of login. Validates OTP against Redis, enforces non-customer users must have `status === "active"`, issues JWT access token and opaque refresh token.

### Request
```typescript
interface VerifyOtpRequest {
  email: string;
  otp:   string; // 4-8 chars per validator; service generates 6-digit numeric
}
```

### Response
```typescript
interface VerifyOtpResponse {
  success:      true;
  accessToken:  string; // JWT, 15 min
  refreshToken: string; // nanoid(32) opaque token, 7200 s
  user: {
    userId:           string;
    userType:         string;
    organizationId:   string;
    organizationType: string;
    name:             string;
    roles:            string[]; // always empty array at this point
  };
}
```
Access token also set as `jwt` HttpOnly cookie (15 min, `sameSite: strict`).

### Errors
| Status | Trigger |
|--------|---------|
| 400    | Validation failure |
| 400    | User not found by email |
| 400    | No 2FA entry in Redis (expired or never initiated) |
| 400    | OTP mismatch or expired |
| 403    | Non-customer user with `status !== "active"` |

### Side effects
- Deletes Redis key `2fa:<email>`.
- Writes Redis key `refresh:<token>` (TTL 7200 s).
- Sets `jwt` cookie on response.

### Idempotency
Not idempotent. Each successful verification rotates tokens.

---

## POST /api/v1/auth/refresh-token

| | |
|---|---|
| Method | POST |
| Path | `/api/v1/auth/refresh-token` |
| Auth | None |
| Idempotent | No |
| Rate limit | None |
| Success | 200 |
| Emits | Nothing |

### Summary
Accepts an opaque refresh token, validates it against Redis, issues a new access token and new refresh token (rotation). Old refresh token is deleted.

### Request
```typescript
interface RefreshTokenRequest {
  refreshToken: string;
}
```

### Response
```typescript
interface RefreshTokenResponse {
  success:      true;
  accessToken:  string;
  refreshToken: string;
}
```
Access token also set as `jwt` HttpOnly cookie (15 min).

### Errors
| Status | Trigger |
|--------|---------|
| 401    | Refresh token not found in Redis |
| 400    | User record not found after Redis lookup |

### Side effects
- Deletes old `refresh:<token>` from Redis.
- Writes new `refresh:<newToken>` (TTL 7200 s).
- Sets `jwt` cookie.

### Idempotency
Not idempotent. Each call rotates the refresh token.

---

## POST /api/v1/auth/logout

| | |
|---|---|
| Method | POST |
| Path | `/api/v1/auth/logout` |
| Auth | None (reads token from cookie or header but does not enforce presence) |
| Idempotent | Yes |
| Rate limit | None |
| Success | 200 |
| Emits | Nothing |

### Summary
Blocklists the access token (remaining TTL) and deletes the refresh token from Redis. Both are optional; omitting both is a no-op that still returns 200.

### Request
```typescript
interface LogoutRequest {
  refreshToken?: string;
}
```
Access token read from `req.cookies.jwt` or `Authorization: Bearer`.

### Response
```typescript
interface LogoutResponse {
  success: true;
  message: "Logged out successfully.";
}
```
Clears `jwt` cookie.

### Errors
| Status | Trigger |
|--------|---------|
| 500    | Redis failure |

### Side effects
- Writes `blocklist:<userId>` in Redis (TTL = remaining access token lifetime) if a valid access token is present.
- Deletes `refresh:<token>` from Redis if `refreshToken` body field is provided.
- Clears `jwt` cookie.

---

## POST /api/v1/auth/request-reset

| | |
|---|---|
| Method | POST |
| Path | `/api/v1/auth/request-reset` |
| Auth | None |
| Idempotent | No |
| Rate limit | None |
| Success | 200 |
| Emits | `notification.authentication.reset.password` |

### Summary
Generates a password reset token stored in MongoDB (`PasswordReset` collection, 15 min TTL), publishes reset link via RabbitMQ. Returns identical 200 whether or not the email is registered (anti-enumeration).

### Request
```typescript
interface RequestResetRequest {
  email: string;
}
```

### Response
```typescript
interface RequestResetResponse {
  success: true;
  message: "If this email is registered you will receive a reset link.";
}
```

### Errors
| Status | Trigger |
|--------|---------|
| 400    | Validation failure |

### Side effects
- Creates `PasswordReset` document in MongoDB with 15 min expiry.
- Publishes `notification.authentication.reset.password`. Fire-and-forget.

---

## POST /api/v1/auth/password-reset

| | |
|---|---|
| Method | POST |
| Path | `/api/v1/auth/password-reset` |
| Auth | None |
| Idempotent | No |
| Rate limit | None |
| Success | 200 |
| Emits | Nothing |

### Summary
Validates the reset token from the `PasswordReset` collection, hashes the new password, updates the user record, deletes the token, and invalidates the Redis user cache.

### Request
```typescript
interface PasswordResetRequest {
  token:       string;
  newPassword: string; // min 8, max 64, complexity enforced
}
```

### Response
```typescript
interface PasswordResetResponse {
  success: true;
  message: "Password reset successfully. You can now log in.";
}
```

### Errors
| Status | Trigger |
|--------|---------|
| 400    | Validation failure |
| 400    | Token not found in database |
| 400    | Token expired |
| 401    | User not found for the token's userId |

### Side effects
- Updates `User.passwordHash` in MongoDB.
- Deletes `PasswordReset` document.
- Deletes `user:<email>` from Redis cache.

---

## POST /api/v1/auth/password-change

| | |
|---|---|
| Method | POST |
| Path | `/api/v1/auth/password-change` |
| Auth | `authenticate` (JWT required) |
| Idempotent | No |
| Rate limit | None |
| Success | 200 |
| Emits | Nothing |

### Summary
Allows an authenticated user to set a new password. Identity is taken from the JWT (`req.user.userId`); the request body does not accept an email field. Fixed in this session (was previously unauthenticated with client-supplied email).

### Request
```typescript
interface ChangePasswordRequest {
  newPassword: string; // min 8, max 64, complexity enforced
}
```

### Response
```typescript
interface ChangePasswordResponse {
  success: true;
  message: "Password changed successfully.";
}
```

### Errors
| Status | Trigger |
|--------|---------|
| 400    | Validation failure |
| 401    | No or invalid JWT |
| 401    | User not found by userId from token |

### Side effects
- Updates `User.passwordHash` in MongoDB via `updateById`.
- Deletes `user:<email>` from Redis cache.