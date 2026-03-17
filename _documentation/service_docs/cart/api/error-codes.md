# Error Codes: Cart Service

**Owner:** Eddy
**Last updated:** 2026-03-17

---

| HTTP | Message | Cause |
|---|---|---|
| 400 | Missing required field | `productId`, `quantity`, `storeId`, or `idempotencyKey` absent from request |
| 401 | Unauthorized | JWT missing, expired, or invalid signature |
| 500 | Internal server error | MongoDB write failed, unhandled exception |
| 404 | Cart not found | No cart document for the given `userId + storeId` or `cartId` |
| 404 | Item not found in cart | `productId` does not exist in `cartItems` array |
| 200 | Cart operation already in progress | Idempotency lock held — duplicate in-flight request on same `idempotencyKey` |