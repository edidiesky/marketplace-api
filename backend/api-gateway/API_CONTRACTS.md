# api-gateway API Contracts

## Global

### Versioning
Rules management routes are under `/api/v1/rules`. Proxy routes use no version prefix at the gateway level; the version is part of the downstream path (e.g. `/:service/api/v1/...`).

### Pagination
Rules list endpoint returns a `pagination` object, not a `meta` object. Shape confirmed from controller:
```typescript
interface Pagination {
  page:  number;
  limit: number;
  total: number; // count of items returned in this response, not total in DB
}
```
Note: `total` is set from `data.length` in `RulesService.getRules`, not from a `countDocuments` call. It reflects the current page size, not the full dataset count. Offset-based pagination is therefore blind to total record count.

### Error format
Two inconsistent shapes exist in this service. Rules endpoints use:
```typescript
interface RulesErrorResponse {
  status: "error";
  errors: Array<{ message: string }>;
}
```
Proxy passthrough and gateway-level errors use:
```typescript
interface GatewayErrorResponse {
  success: false;
  message: string;
}
```
Validation errors from the `validate` middleware (defined but not wired to any route in this service) would use the `RulesErrorResponse` shape.

### Success response shape
Rules endpoints:
```typescript
interface RulesSuccessResponse<T> {
  status: "success";
  data:   T;
}
```
Gateway-level responses (`/health`, `/metrics`, circuit breaker 503):
```typescript
interface GatewaySuccessResponse {
  status?: string;
  success?: boolean;
  // varies per endpoint
}
```

### Token model
JWT verification at the gateway uses the same `JWT_CODE` secret as the auth service, with `issuer: "selleasi"` and `audience: "selleasi-client"` enforced. JWT blocklist is checked via Redis key `blocklist:<userId>`. On Redis failure during blocklist check the gateway returns 503 rather than failing open (unlike the auth service, which fails open on Redis error in `authenticate`).

Access token is read from `Authorization: Bearer <token>` first, then `req.cookies.jwt`.

### Headers forwarded to downstream services
For all proxied requests, the gateway forwards:
- `authorization`
- `cookie`
- `x-paystack-signature`
- `verif-hash`
- `x-request-id`
- `x-user-id` (from JWT, authenticated requests only)
- `x-user-type` (from JWT, authenticated requests only)
- `x-organization-id` (from JWT, authenticated requests only)
- `x-store-id` (from subdomain resolution, when applicable)
- `x-store-organization-id` (from subdomain resolution, when applicable)
- `x-store-name` (from subdomain resolution, when applicable)

`content-type` is hardcoded to `application/json` on all forwarded requests, overriding what the client sent.

---

## Proxy handler

### Summary
Matches `/:service/*` after authentication and rate limiting middleware. Resolves the service name to a downstream URL, forwards the request via Axios, and pipes the response back. The service name must match a key in the `services` map in `constants.ts`.

| | |
|---|---|
| Method | Any (GET, POST, PUT, PATCH, DELETE) |
| Path | `/:service/*` |
| Auth | `authenticate` for non-public services; none for `auth/*` and `payment/api/v1/webhooks/*` |
| Rate limit | `rateLimiter` for all non-webhook paths |
| Timeout | 8 000 ms per downstream request |
| Circuit breaker | Per service, opossum. Opens at 50% errors / 5 req minimum, resets after 30 s. |

### Errors
| Status | Trigger |
|--------|---------|
| 400    | Unknown service name in path |
| 401    | Missing or invalid JWT (non-public route) |
| 429    | Rate limit exceeded |
| 503    | Circuit breaker open |
| 503    | Redis unavailable during JWT blocklist check |
| 4xx/5xx | Passthrough from downstream service (for status < 500 per `validateStatus`) |

---

## POST /api/v1/rules

| | |
|---|---|
| Method | POST |
| Path | `/api/v1/rules` |
| Auth | `authenticate` |
| Idempotent | No |
| Rate limit | `rateLimiter` |
| Success | 201 |
| Emits | Redis PubSub `gateway:rules:sync` with `{ type: "rules:reload" }` |

### Summary
Creates a rate limit rule in MongoDB, applies it to the local in-memory rules engine, and broadcasts a reload signal to all gateway instances. Duplicate detection is by `id_value` + `resource` combination.

Note: Joi validation schemas exist in `src/validator/rules.validators.ts` but are not applied to this route. The controller receives raw `req.body`.

### Request
```typescript
interface CreateRuleRequest {
  id_type:  "user_id" | "ip" | "api_key";
  id_value: string;
  resource: string; // route pattern, supports trailing wildcard e.g. "/auth/*"
  limits: {
    algorithm:       "token-bucket" | "sliding-window-log";
    max_req:         number; // min 1
    windowMs:        number; // min 1000
    refillRate?:     number;
    burstMultiplier?: number;
  };
  enabled?: boolean; // defaults to true
}
```

### Response
```typescript
interface CreateRuleResponse {
  status: "success";
  data:   IRules; // full Mongoose document
}
```

### Errors
| Status | Trigger |
|--------|---------|
| 401    | Missing or invalid JWT |
| 409    | Rule already exists for same `id_value` + `resource` |
| 500    | DB write failure |

### Side effects
- Writes `Rules` document to MongoDB.
- Calls `rulesEngine.upsertRule()` on local instance.
- Publishes `{ type: "rules:reload" }` to Redis channel `gateway:rules:sync`.
- If `id_type === "user_id"`, also calls `rulesEngine.setUserOverride()` and publishes `{ type: "rules:override", userId: id_value }`.

---

## GET /api/v1/rules

| | |
|---|---|
| Method | GET |
| Path | `/api/v1/rules` |
| Auth | `authenticate` |
| Idempotent | Yes |
| Rate limit | `rateLimiter` |
| Success | 200 |
| Emits | Nothing |

### Summary
Returns a paginated list of rules. Filterable by `resource` and `enabled`.

### Request
Query parameters:
```typescript
interface GetRulesQuery {
  page?:     number; // default 1
  limit?:    number; // default 20
  resource?: string;
  enabled?:  boolean;
}
```

### Response
```typescript
interface GetRulesResponse {
  status: "success";
  data:   IRules[];
  pagination: {
    page:  number;
    limit: number;
    total: number; // count of items in current response, not total in DB
  };
}
```

### Errors
| Status | Trigger |
|--------|---------|
| 401    | Missing or invalid JWT |
| 500    | DB read failure |

---

## GET /api/v1/rules/:ruleId

| | |
|---|---|
| Method | GET |
| Path | `/api/v1/rules/:ruleId` |
| Auth | `authenticate` |
| Idempotent | Yes |
| Rate limit | `rateLimiter` |
| Success | 200 |
| Emits | Nothing |

### Request
Path parameter: `ruleId` (string, MongoDB ObjectId).

### Response
```typescript
interface GetSingleRuleResponse {
  status: "success";
  data:   IRules;
}
```

### Errors
| Status | Trigger |
|--------|---------|
| 401    | Missing or invalid JWT |
| 404    | Rule not found |
| 500    | DB read failure |

---

## PUT /api/v1/rules/:ruleId

| | |
|---|---|
| Method | PUT |
| Path | `/api/v1/rules/:ruleId` |
| Auth | `authenticate` |
| Idempotent | Yes |
| Rate limit | `rateLimiter` |
| Success | 200 |
| Emits | Redis PubSub `gateway:rules:sync` |

### Summary
Updates `limits`, `enabled`, and/or `resource` on an existing rule. At least one field required. Syncs to engine and broadcasts reload.

### Request
```typescript
interface UpdateRuleRequest {
  limits?: {
    algorithm?:      "token-bucket" | "sliding-window-log";
    max_req?:        number;
    windowMs?:       number;
    refillRate?:     number;
    burstMultiplier?: number;
  };
  enabled?:  boolean;
  resource?: string;
}
```

### Response
```typescript
interface UpdateRuleResponse {
  status: "success";
  data:   IRules;
}
```

### Errors
| Status | Trigger |
|--------|---------|
| 401    | Missing or invalid JWT |
| 404    | Rule not found |
| 500    | DB update failure |

### Side effects
Same as POST: syncs to local engine and publishes PubSub reload. User override logic applies if `id_type === "user_id"`.

---

## PATCH /api/v1/rules/:ruleId/toggle

| | |
|---|---|
| Method | PATCH |
| Path | `/api/v1/rules/:ruleId/toggle` |
| Auth | `authenticate` |
| Idempotent | Yes |
| Rate limit | `rateLimiter` |
| Success | 200 |
| Emits | Redis PubSub `gateway:rules:sync` |

### Summary
Convenience wrapper around `updateRule` that sets only the `enabled` field. Internally delegates to the same service method as PUT.

### Request
```typescript
interface ToggleRuleRequest {
  enabled: boolean;
}
```

### Response
```typescript
interface ToggleRuleResponse {
  status: "success";
  data:   IRules;
}
```

### Errors
| Status | Trigger |
|--------|---------|
| 401    | Missing or invalid JWT |
| 404    | Rule not found |
| 500    | DB update failure |

---

## DELETE /api/v1/rules/:ruleId

| | |
|---|---|
| Method | DELETE |
| Path | `/api/v1/rules/:ruleId` |
| Auth | `authenticate` |
| Idempotent | Yes |
| Rate limit | `rateLimiter` |
| Success | 200 |
| Emits | Redis PubSub `gateway:rules:sync` |

### Summary
Deletes the rule from MongoDB, evicts it from the local engine immediately, and broadcasts a reload signal. If `id_type === "user_id"`, also removes the per-user override from the engine.

### Request
Path parameter: `ruleId` (string, MongoDB ObjectId).

### Response
```typescript
interface DeleteRuleResponse {
  status: "success";
  data:   null;
}
```

### Errors
| Status | Trigger |
|--------|---------|
| 401    | Missing or invalid JWT |
| 404    | Rule not found |
| 500    | DB delete failure |

### Side effects
- Deletes `Rules` document from MongoDB.
- Calls `rulesEngine.deleteRule()` on local instance.
- Publishes `{ type: "rules:reload" }` to Redis channel `gateway:rules:sync`.
- If `id_type === "user_id"`, calls `rulesEngine.removeUserOverride()` and publishes override sync.