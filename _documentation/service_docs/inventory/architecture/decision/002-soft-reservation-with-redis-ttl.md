# ADR-002: Soft Reservation with Redis TTL Enforcement

**Status:** Accepted
**Date:** 2026-03-17
**Owner:** Eddy

---

## Context

When a reservation is created at checkout, the stock must be released if payment never completes. Two enforcement strategies were evaluated:

1. **Hard reservation with DB TTL** - store reservation expiry in MongoDB, run a cron that queries and releases expired rows
2. **Soft reservation with Redis TTL** - store reservation metadata in Redis with a native TTL, run a worker that detects expired keys and releases stock in MongoDB

---

## Decision

Soft reservation with Redis TTL. Each reservation writes a key `inv:reservation:{sagaId}` to Redis with a 10-minute TTL. A background worker runs every 5 minutes. It queries MongoDB for any inventory document where `quantityReserved > 0`, then checks whether a corresponding Redis reservation key exists. If no key exists and reserved quantity is positive, the reservation has expired and stock is released back to available.

---

## Rationale

**Why not a DB TTL field:**
MongoDB TTL indexes operate on the document level, not subdocument level. Inventory is a single document per product per store. You cannot TTL a partial field update. A separate `reservations` collection would be needed, which adds a join at every stock-check read.

**Why Redis TTL:**
Redis TTL is native, precise, and requires no polling of expired records. The reservation key disappearing is the expiry signal. The worker only needs to cross-reference MongoDB reserved quantity against key existence, which is a simple set difference operation.

**Why 10 minutes:**
Long enough for a user to complete payment including 3DS authentication. Short enough that abandoned checkouts do not hold stock for extended periods. Configurable via `RESERVATION_TTL_SECONDS` env var.

---

## Reservation Key Format

```
inv:reservation:{sagaId}
```

Value stored:
```json
{ "productId": "...", "storeId": "...", "quantity": 2 }
```

TTL: 600 seconds (10 minutes).

---

## Worker Behaviour

- Runs every 5 minutes via `setInterval` on service startup
- Queries `Inventory.find({ quantityReserved: { $gt: 0 } })`
- For each document, scans for `inv:reservation:*` keys in Redis
- If no reservation key maps to the document's reserved quantity, releases the full `quantityReserved` back to `quantityAvailable`
- Uses the same `$inc` + `$gte` guard as normal release to prevent double-release
- Logs every release as a warning for audit

---

## Consequences

- If Redis is unavailable, reservation TTL enforcement stops. Stale reservations will accumulate until Redis recovers. This is acceptable because the Kafka `ORDER_PAYMENT_FAILED` event is the primary release mechanism. The worker is a safety net, not the primary path.
- The worker uses `redisClient.keys()` which is O(N) on keyspace. Acceptable at portfolio scale. At production scale, replace with a Redis Set that tracks active reservation keys per store.