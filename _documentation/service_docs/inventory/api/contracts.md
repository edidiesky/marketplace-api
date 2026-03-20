# API Contracts: Inventory Service

**Base URL:** `/api/v1/inventories`
**Auth:** Bearer JWT required unless noted. Internal endpoints require `x-internal-secret` header.
**Last updated:** 2026-03-17
**Owner:** Eddy

All responses are JSON. All timestamps are ISO 8601 UTC. All IDs are MongoDB ObjectId strings.

---

## POST /:storeId/store

It creates an inventory record for a product in a store. One record per product per store.

Inventory records are also created automatically via the `product.onboarding.completed` Kafka event when a product is onboarded. This endpoint is for manual creation or backfill.

**Auth:** Bearer JWT (store owner)

**Path params**

| Param     | Type            | Description |
| --------- | --------------- | ----------- |
| `storeId` | ObjectId string | Store scope |

**Request body**

| Field               | Type     | Required | Constraints                  |
| ------------------- | -------- | -------- | ---------------------------- |
| `productId`         | string   | Yes      | Valid ObjectId               |
| `productTitle`      | string   | No       | -                            |
| `productImage`      | string[] | No       | -                            |
| `sku`               | string   | No       | Unique per store if provided |
| `quantityOnHand`    | number   | Yes      | >= 0                         |
| `quantityAvailable` | number   | Yes      | >= 0, <= quantityOnHand      |
| `reorderPoint`      | number   | No       | Defaults to 10               |
| `reorderQuantity`   | number   | No       | Defaults to 50               |

**Response: 201 Created**

```json
{
  "_id": "ObjectId",
  "ownerId": "ObjectId",
  "productId": "ObjectId",
  "storeId": "ObjectId",
  "quantityOnHand": 100,
  "quantityAvailable": 100,
  "quantityReserved": 0,
  "reorderPoint": 10,
  "reorderQuantity": 50,
  "isLowStock": false,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errors**

| HTTP | Condition |

|---|---|
| 400 | Missing required field |
| 401 | Missing or invalid JWT |
| 409 | Inventory already exists for this productId + storeId |

---

## GET /:storeId/store

Paginated list of all inventory records for a store.

**Auth:** Bearer JWT

**Query params**

| Param        | Type    | Default | Description            |
| ------------ | ------- | ------- | ---------------------- |
| `page`       | number  | 1       | Page number            |
| `limit`      | number  | 10      | Items per page         |
| `isLowStock` | boolean | -       | Filter low stock items |

**Response: 200 OK**

```json
{
  "data": {
    "inventories": [...],
    "totalCount": 84,
    "totalPages": 9
  },
  "success": true,
  "statusCode": 200
}
```

---

## GET /check/:productId

Read-only stock availability check. Used by the frontend cart view to warn users of low or zero stock. Does not mutate any state.

**Auth:** None (public read)

**Path params**

| Param       | Type            | Description      |
| ----------- | --------------- | ---------------- |
| `productId` | ObjectId string | Product to check |

**Query params**

| Param     | Type   | Required | Description |
| --------- | ------ | -------- | ----------- |
| `storeId` | string | Yes      | Store scope |

**Response: 200 OK**

```json
{
  "productId": "ObjectId",
  "storeId": "ObjectId",
  "quantityAvailable": 8,
  "quantityOnHand": 10,
  "quantityReserved": 2
}
```

**Errors**

| HTTP | Condition                                        |
| ---- | ------------------------------------------------ |
| 404  | No inventory record for this productId + storeId |

---

## GET /:id

Fetch a single inventory record by MongoDB `_id`.

**Auth:** Bearer JWT

**Response: 200 OK**

Full inventory document. Same shape as POST 201 response.

**Errors**

| HTTP | Condition           |
| ---- | ------------------- |
| 404  | Inventory not found |

---

## PUT /:id

Update inventory fields (title, images, reorder thresholds). Does not directly set quantity fields. Use stock adjustment endpoints for quantity changes.

**Auth:** Bearer JWT (store owner)

**Request body**

Any subset of non-quantity fields. Quantity fields (`quantityOnHand`, `quantityAvailable`, `quantityReserved`) are ignored if provided.

**Response: 200 OK**

Full updated inventory document.

**Errors**

| HTTP | Condition                |
| ---- | ------------------------ |
| 400  | Inventory does not exist |
| 401  | Missing or invalid JWT   |

---

## DELETE /:id

Delete an inventory record. Only valid if `quantityReserved = 0`.

**Auth:** Bearer JWT (store owner)

**Response: 200 OK**

```json
{ "message": "Inventory deleted successfully" }
```

**Errors**

| HTTP | Condition                                        |
| ---- | ------------------------------------------------ |
| 400  | Inventory does not exist                         |
| 409  | Cannot delete inventory with active reservations |

---

## POST /reserve

Reserve stock for an in-progress checkout. Atomically decrements `quantityAvailable` and increments `quantityReserved`.

**Auth:** `x-internal-secret` header (order service only)

**Request body**

| Field       | Type   | Required | Description                                  |
| ----------- | ------ | -------- | -------------------------------------------- |
| `storeId`   | string | Yes      | Store scope                                  |
| `productId` | string | Yes      | Product to reserve                           |
| `quantity`  | number | Yes      | Units to reserve, >= 1                       |
| `userId`    | string | Yes      | Buyer user ID                                |
| `sagaId`    | string | Yes      | Unique saga/order identifier for idempotency |

**Response: 201 Created**

```json
{
  "success": true,
  "reservationId": "{sagaId}-{productId}",
  "expiresAt": "ISO8601",
  "quantityReserved": 2,
  "remainingAvailable": 8
}
```

**Errors**

| HTTP | Condition |

|---|---|

| Missing required field or quantity <= 0 |
| 400 | Insufficient stock. Body includes `availableStock` |
| 409 | Stock contention. Caller should retry with backoff |
| 401 | Missing or invalid `x-internal-secret` |

---

## POST /release

Release a reservation back to available. Called on payment failure or order cancellation.

**Auth:** `x-internal-secret` header (order service only)

**Request body**

Same shape as `/reserve`.

**Response: 200 OK**

```json
{
  "success": true,
  "releasedQuantity": 2,
  "newAvailable": 10,
  "remainingReserved": 0
}
```

**Errors**

| HTTP | Condition |

|---|---|

| Missing required field |
| 400 | Cannot release more than currently reserved |
| 409 | Stock contention. Retry with backoff |
| 401 | Missing or invalid `x-internal-secret` |

---

## POST /commit

Permanently deduct stock after payment confirmed. Decrements `quantityReserved` and `quantityOnHand`. `quantityAvailable` is unchanged (already reduced at reserve time).

**Auth:** `x-internal-secret` header (order service only)

**Request body**

Same shape as `/reserve`.

**Response: 200 OK**

```json
{
  "success": true,
  "committedQuantity": 2,
  "remainingOnHand": 8,
  "remainingReserved": 0
}
```

**Errors**

| HTTP | Condition |

|---|---|

| Missing required field |
| 404 | Reservation not found. May have expired or already committed |
| 409 | Stock contention. Retry with backoff |
| 401 | Missing or invalid `x-internal-secret` |

---

## Internal Events Consumed (Kafka)

| Topic                          | Published by          | Action                                  |
| ------------------------------ | --------------------- | --------------------------------------- |
| `product.onboarding.completed` | Product service       | Create inventory record for new product |
| `order.checkout.started`       | Order service         | Reserve stock for all items in order    |
| `order.payment.completed`      | Order/Payment service | Commit stock permanently                |
| `order.payment.failed`         | Order/Payment service | Release reservation back to available   |

---

## Internal Events Published (Kafka)

| Topic                      | Trigger                                                        | Payload                                                                 |
| -------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `order.reservation.failed` | Any item fails reservation in `order.checkout.started` handler | `{ orderId, sagaId, userId, storeId, reason, failedItems[], failedAt }` |
