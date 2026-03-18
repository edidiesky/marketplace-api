# Error Codes: Inventory Service

**Owner:** Inventory service team
**Last updated:** 2026-03-17

---

| HTTP | Message | Cause |
|---|---|---|
| 400 | Missing required field or invalid input | Required field absent, quantity <= 0, or inventory not found on update/delete |
| 401 | Unauthorized | JWT missing, expired, or invalid signature |
| 409 | Inventory already exists | Duplicate `productId + storeId` on create |
| 404 | Inventory not found | No record for given `_id` or `productId + storeId` |
| 409 | Cannot delete with active reservations | `quantityReserved > 0` at time of delete |
| 400 | Insufficient stock | `quantityAvailable < requested quantity`. Body includes `availableStock` field. |
| 409 | Stock contention | Redis lock held by concurrent operation. Caller should retry with exponential backoff. |
| 401 | Internal service unauthorized | `x-internal-secret` header missing or does not match `INTERNAL_SERVICE_SECRET` env var |
| 400 | Insufficient reservation | Release quantity exceeds `quantityReserved` |
| 404 | Reservation not found | Commit attempted for a `sagaId` with no matching reservation. May have expired or already been committed. |