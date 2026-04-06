# API Contracts: Auth Service

**Base URL:** `/api/v1/auth`
**Auth:** Bearer JWT required only where noted
**Last updated:** 2026-04-06
**Port:** 4001

All responses are JSON. All timestamps are ISO 8601 UTC. All IDs are MongoDB ObjectId strings.

---

## Onboarding flow

Registration is a four-step flow. Each step depends on the previous one completing successfully. Redis tracks progress between steps using the email as the key. If any step is skipped or the Redis key expires, the flow must restart from step 1.

```
POST /verify-email
  > GET /email/confirmation?token=
    > POST /verify-password
      > POST /signup
```

---

## POST /verify-email

Step 1 of registration. Checks the email is not already taken and sends a magic link to the provided address. The link contains a short-lived token that must be confirmed in step 2.

**Auth:** None

**Request body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string | Yes | Valid email format |

**Example request**

```json
{
  "email": "seller@example.com"
}
```

**Response: 200 OK**

```json
{
  "success": true,
  "message": "Verification link sent. Check your inbox."
}
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| AUTH_001 | 400 | Email missing or invalid format |
| AUTH_002 | 409 | Email already registered |
| AUTH_003 | 500 | Failed to send magic link email |

---

## GET /email/confirmation

Step 2 of registration. Verifies the token from the magic link sent in step 1. Token is passed as a query parameter. On success the email is marked as verified in Redis and the user can proceed to step 3.

**Auth:** None

**Query params**

| Param | Type | Required | Description |
|---|---|---|---|
| `token` | string | Yes | Short-lived token from the magic link |

**Response: 200 OK**

```json
{
  "success": true,
  "message": "Email confirmed successfully."
}
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| AUTH_004 | 400 | Token missing from query |
| AUTH_005 | 400 | Token invalid or expired (15min TTL) |

---

## POST /verify-password

Step 3 of registration. Accepts the email and chosen password. The email must have been confirmed in step 2 otherwise this returns 400. The password is hashed and stored against the pending registration in Redis.

**Auth:** None

**Request body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string | Yes | Must match the email confirmed in step 2 |
| `password` | string | Yes | Min 8 chars, must include uppercase, number, special char |

**Example request**

```json
{
  "email": "seller@example.com",
  "password": "Password@123"
}
```

**Response: 200 OK**

```json
{
  "success": true,
  "message": "Password set. Complete your profile to finish registration."
}
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| AUTH_001 | 400 | Validation failed |
| AUTH_006 | 400 | Email not yet confirmed in step 2 |
| AUTH_007 | 400 | Password does not meet strength requirements |

---

## POST /signup

Step 4 and final step of registration. Submits profile details to create the user document in MongoDB. On success emits `USER_ONBOARDING_COMPLETED_TOPIC` to Kafka which triggers the tenant provisioning saga in the tenant service. The `tenantId` is not available until the saga completes and patches the user record asynchronously. For sellers, `Verify2FA` blocks login until `tenantStatus` is `ACTIVE`.

**Auth:** None

**Request body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string | Yes | Must match email from steps 1-3 |
| `firstName` | string | Yes | Non-empty |
| `lastName` | string | Yes | Non-empty |
| `phoneNumber` | string | Yes | Valid phone number |
| `role` | string | Yes | One of: `customer`, `seller`, `admin` |
| `country` | string | No | ISO country code |

**Example request**

```json
{
  "email": "seller@example.com",
  "firstName": "Ada",
  "lastName": "Okafor",
  "phoneNumber": "+2348012345678",
  "role": "seller",
  "country": "NG"
}
```

**Response: 201 Created**

```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "email": "seller@example.com",
    "firstName": "Ada",
    "lastName": "Okafor",
    "role": "seller",
    "tenantStatus": "PENDING",
    "createdAt": "2026-04-06T10:00:00.000Z"
  }
}
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| AUTH_001 | 400 | Validation failed |
| AUTH_006 | 400 | Prior onboarding steps not completed or Redis key expired |
| AUTH_002 | 409 | Email already registered |
| AUTH_008 | 500 | Kafka publish failed after user created |

---

## POST /login

Validates credentials and triggers the 2FA step. On success generates a 6-digit OTP stored in Redis with a 15-minute TTL and sends it via email or SMS. The access token is not returned here. It is returned by `POST /verify-otp` after the OTP is confirmed. For sellers, login is blocked if `tenantStatus` is not `ACTIVE`.

**Auth:** None

**Request body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Non-empty |

**Example request**

```json
{
  "email": "seller@example.com",
  "password": "Password@123"
}
```

**Response: 200 OK**

```json
{
  "success": true,
  "message": "OTP sent to your registered email."
}
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| AUTH_001 | 400 | Validation failed |
| AUTH_009 | 401 | Invalid email or password |
| AUTH_010 | 403 | Tenant not yet active. Seller registration saga still in-flight |

---

## POST /verify-otp

Validates the OTP submitted by the user against the Redis-stored value. On success returns the stateless access token (15-minute JWT) in the response body and sets the stateful refresh token (7-day `nanoid(32)`) as an HttpOnly cookie.

**Auth:** None

**Request body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string | Yes | Valid email format |
| `otp` | string | Yes | 6-digit numeric string |

**Example request**

```json
{
  "email": "seller@example.com",
  "otp": "482910"
}
```

**Response: 200 OK**

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "seller@example.com",
      "firstName": "Ada",
      "lastName": "Okafor",
      "role": "seller",
      "tenantId": "64f1a2b3c4d5e6f7a8b9c0d2",
      "tenantStatus": "ACTIVE",
      "permissions": ["products:write", "orders:read"],
      "roleLevel": 2
    }
  }
}
```

**Cookies set**

| Cookie | Value | Flags |
|---|---|---|
| `refreshToken` | 7-day `nanoid(32)` string | `HttpOnly`, `Secure`, `SameSite=Strict` |

**JWT payload**

| Field | Type | Description |
|---|---|---|
| `userId` | string | MongoDB ObjectId |
| `role` | string | User role |
| `tenantId` | string | Tenant ObjectId |
| `tenantType` | string | Type of tenant |
| `tenantPlan` | string | Billing plan |
| `permissions` | string[] | Granted permissions array |
| `roleLevel` | number | Numeric role hierarchy level |

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| AUTH_001 | 400 | Validation failed |
| AUTH_011 | 401 | OTP invalid or expired (15min TTL) |

---

## POST /refresh-token

Reads the refresh token from the HttpOnly cookie or request body. Validates it against Redis, rotates it (old token deleted, new token issued in a single Redis pipeline), and returns a new 15-minute access token.

**Auth:** None (reads from HttpOnly cookie)

**Request body (fallback if cookie not present)**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `refreshToken` | string | No | Only needed if cookie is not present |

**Response: 200 OK**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Cookies set**

| Cookie | Value | Flags |
|---|---|---|
| `refreshToken` | New 7-day `nanoid(32)` | `HttpOnly`, `Secure`, `SameSite=Strict` |

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| AUTH_012 | 401 | Refresh token missing |
| AUTH_013 | 401 | Refresh token not found in Redis or does not match |

---

## POST /logout

Deletes the refresh token from Redis and writes the `userId` to the Redis blocklist with a TTL equal to the remaining access token lifetime. Subsequent requests with the old access token are rejected by the `authenticate` middleware.

**Auth:** Bearer JWT required

**Request body:** None

**Response: 200 OK**

```json
{
  "success": true,
  "message": "Logged out successfully."
}
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| AUTH_014 | 401 | Missing or expired Bearer token |

---

## POST /request-reset

Sends a password reset link to the registered email if the account exists. Always returns 200 regardless of whether the email is registered. This is intentional to prevent user enumeration attacks. Do not treat a 200 response as confirmation that the email exists.

**Auth:** None

**Request body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string | Yes | Valid email format |

**Example request**

```json
{
  "email": "seller@example.com"
}
```

**Response: 200 OK (always)**

```json
{
  "success": true,
  "message": "If this email is registered you will receive a reset link."
}
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| AUTH_001 | 400 | Validation failed |

---

## POST /password-reset

Validates the signed reset token and updates the password hash. The token is single-use and has a short TTL. After use the token is deleted from the `passwordReset` collection in MongoDB.

**Auth:** None

**Request body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `token` | string | Yes | Reset token from the email link |
| `password` | string | Yes | Min 8 chars, must include uppercase, number, special char |

**Example request**

```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0",
  "password": "NewPassword@456"
}
```

**Response: 200 OK**

```json
{
  "success": true,
  "message": "Password reset successfully. Please login."
}
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| AUTH_001 | 400 | Validation failed |
| AUTH_015 | 400 | Token invalid, expired, or already used |

---

## POST /password-change

Allows an authenticated user to change their password by providing their current password and the new one. On success all existing refresh tokens for this user are invalidated.

**Auth:** Bearer JWT required

> **Note:** The `authenticate` middleware is missing from this route in the current router implementation. It relies on the handler checking the token manually. This should be fixed by adding `authenticate` as middleware before `ChangePasswordHandler`.

**Request body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `currentPassword` | string | Yes | Non-empty |
| `newPassword` | string | Yes | Min 8 chars, must include uppercase, number, special char |

**Example request**

```json
{
  "currentPassword": "Password@123",
  "newPassword": "NewPassword@456"
}
```

**Response: 200 OK**

```json
{
  "success": true,
  "message": "Password changed. Please login again."
}
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| AUTH_001 | 400 | Validation failed |
| AUTH_016 | 400 | Current password incorrect |
| AUTH_014 | 401 | Missing or expired Bearer token |

---

## Internal events consumed (Kafka)

| Topic | Published by | Action |
|---|---|---|
| `tenant.onboarding.completed` | Tenant service | Patch user with `tenantId` and set `tenantStatus = ACTIVE` |
| `user.rollback` | Tenant service | Delete user record when tenant provisioning saga fails |

---

## Internal events published (Kafka)

| Topic | Trigger | Key payload fields |
|---|---|---|
| `user.onboarding.completed` | `POST /signup` success | `userId`, `email`, `role`, `firstName`, `lastName` |

---

