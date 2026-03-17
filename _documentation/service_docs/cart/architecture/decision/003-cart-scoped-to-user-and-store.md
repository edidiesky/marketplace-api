# ADR-003: Cart Scoped to User + Store

**Status:** Accepted
**Date:** 2026-03-17
**Owner:** Eddy

---

## Context

This is a multi-tenant platform where each store is an independent tenant. A user can browse and shop across multiple stores. The question is how to scope the cart document.

Three options:

1. **Global cart** - one cart per user, items from any store mixed together
2. **Per-store cart** - one cart per user per store (unique index on `userId + storeId`)
3. **Per-session cart** - ephemeral, no persistence across sessions

---

## Decision

One cart per user per store. Basically, the `userId + storeId` compound index is simply unique. A user shopping at two different stores will surely have two separate cart documents.

---

## Rationale

**Why not a global cart:**
Stores are independent tenants. Payment, inventory, and order processing are all scoped to a single store. A checkout that spans multiple stores would require a distributed transaction across multiple store inventories, payment accounts, and order systems. This is not a supported flow. Keeping the cart scoped to one store keeps checkout simple and consistent.

**Why not per-session:**
Cart persistence across sessions is a basic e-commerce requirement. A user should be able to add items on mobile, return on desktop, and see the same cart.

---

## Consequences

- The `storeId` is required on all cart endpoints.
- The frontend must manage which store's cart it is displaying or modifying.
- Checkout is always against a single store's cart, which maps cleanly to a single order and a single inventory reservation flow.