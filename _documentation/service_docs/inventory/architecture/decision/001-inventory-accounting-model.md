# ADR-001: Three-Field Inventory Accounting Model

**Status:** Accepted
**Date:** 2026-03-17
**Owner:** Inventory service team

---

## Context

When a product is sold through a checkout flow that involves payment processing, there is a window between "customer initiated checkout" and "payment confirmed" where the stock must be held but not yet permanently deducted. Three approaches were evaluated:

1. **Single field** - one `quantity` field, deduct immediately on checkout
2. **Two fields** - `available` and `sold`, derive reserved from the difference
3. **Three fields** - `quantityOnHand`, `quantityAvailable`, `quantityReserved` as explicit separate counters

---

## Decision

Three explicit fields with the following invariant enforced at all times:

```
quantityOnHand = quantityAvailable + quantityReserved
```

---

## Field Definitions

| Field | Meaning | When it changes |
|---|---|---|
| `quantityOnHand` | Physical stock count. Total units owned. | Only on commit (sale confirmed) or stock replenishment |
| `quantityAvailable` | Units buyers can still purchase. | Decremented on reserve, incremented on release |
| `quantityReserved` | Units held for in-progress checkouts. | Incremented on reserve, decremented on release or commit |

---

## Operation Accounting

### Reserve (checkout initiated)
```
quantityAvailable -= quantity
quantityReserved  += quantity
quantityOnHand     unchanged
```

### Release (payment failed or checkout abandoned)
```
quantityAvailable += quantity
quantityReserved  -= quantity
quantityOnHand     unchanged
```

### Commit (payment confirmed)
```
quantityReserved  -= quantity
quantityOnHand    -= quantity
quantityAvailable  unchanged  // already reduced at reserve time
```

---

## Rationale

**Why not single field:** A single field cannot represent the in-progress state. If you deduct on checkout start and payment fails, you must add back, creating a race condition window where stock appears gone but is not sold.

**Why not two fields:** Deriving reserved from `onHand - available` is error-prone under concurrent writes. Explicit fields make the invariant auditable and queryable.

**Why three explicit fields:** Each field has a clear, single responsibility. Queries like "how much is held in pending orders" or "how much can a new buyer purchase" are O(1) reads with no derivation.

---

## Consequences

- All three fields must be updated atomically using MongoDB `$inc` inside a transaction.
- A `$gte` guard must be applied on the field being decremented to prevent negative values under concurrent writes.
- The invariant `onHand = available + reserved` must be validated in any stock reconciliation job.