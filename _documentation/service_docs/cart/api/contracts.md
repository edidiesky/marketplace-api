# API Contracts: Cart Service

**Base URL:** `/api/v1/carts`
**Auth:** Bearer JWT required on all endpoints unless noted
**Last updated:** 2026-03-17
**Owner:** Eddy

All responses are JSON. All timestamps are ISO 8601 UTC. All IDs are MongoDB ObjectId strings.

---

## POST /carts/:storeId/items

Add a product to the user's cart for a specific store. If the product already exists in the cart, the item is replaced with the new quantity. If no cart exists for this user + store combination, one is created.

This endpoint does **not** check or reserve inventory. Inventory is checked at checkout.

**Path params**

| Param | Type | Description |
|---|---|---|
| `storeId` | ObjectId string | The store the cart belongs to |

**Request body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `productId` | string | Yes | Valid ObjectId |
| `productTitle` | string | Yes | Non-empty |
| `productImage` | string[] | Yes | At least one URL |
| `productPrice` | number | Yes | > 0 |
| `productDescription` | string | No | - |
| `quantity` | number | No | >= 1, defaults to 1 |
| `sellerId` | string | Yes | Valid ObjectId |
| `email` | string | No | - |
| `idempotencyKey` | string | Yes | Client-generated unique key per request |

**Response: 201 Created**

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "storeId": "ObjectId",
  "sellerId": "ObjectId",
  "fullName": "string",
  "quantity": 3,
  "totalPrice": 149.97,
  "expireAt": "ISO8601",
  "version": 2,
  "cartItems": [
    {
      "productId": "ObjectId",
      "productTitle": "string",
      "productImage": ["url"],
      "productPrice": 49.99,
      "productQuantity": 3,
      "productDescription": "string",
      "reservedAt": "ISO8601",
      "availabilityStatus": "available"
    }
  ],
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Response: 200 OK**
Returned instead of 201 when the idempotency lock is already held (mainly duplicate in-flight request).

```json
{ "message": "Cart operation already in progress" }
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| CART_001 | 400 | Missing required field |
| CART_002 | 401 | Missing or invalid JWT |
| CART_003 | 500 | MongoDB write failed |

---

## GET /carts/:storeId

Fetch the authenticated user's cart for a specific store.

**Path params**

| Param | Type | Description |
|---|---|---|
| `storeId` | ObjectId string | The store scope |

**Response: 200 OK**

Same shape as `POST /carts/:storeId/items` response body.

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| CART_002 | 401 | Missing or invalid JWT |
| CART_004 | 404 | No cart found for this user + store |

---

## PATCH /carts/:storeId/items/:itemId

Update the quantity of a specific item in the user's cart.

**Path params**

| Param | Type | Description |
|---|---|---|
| `storeId` | ObjectId string | The store scope |

**Request body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `productId` | string | Yes | Valid ObjectId |
| `quantity` | number | Yes | >= 1 |

**Response: 200 OK**

Returns the full updated cart document. Same shape as GET response.

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| CART_001 | 400 | `productId` or `quantity` missing |
| CART_002 | 401 | Missing or invalid JWT |
| CART_004 | 404 | Cart or item not found |

---

## DELETE /carts/:storeId/items/:itemId

Remove a specific item from the user's cart.

**Path params**

| Param | Type | Description |
|---|---|---|
| `storeId` | ObjectId string | The store scope |

**Request body**

| Field | Type | Required | Constraints |
|---|---|---|---|
| `productId` | string | Yes | Valid ObjectId |

**Response: 200 OK**

```json
{ "message": "Item removed from cart" }
```

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| CART_001 | 400 | `productId` missing |
| CART_002 | 401 | Missing or invalid JWT |
| CART_004 | 404 | Cart or item not found |

---

## GET /carts/:storeId/all

Paginated list of all carts for a store. Admin only.

**Query params**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page |

**Response: 200 OK**

```json
{
  "data": {
    "carts": [...],
    "totalCount": 42,
    "totalPages": 5
  },
  "success": true,
  "statusCode": 200
}
```

---

## GET /carts/:id/single

Fetch any cart by its MongoDB `_id`. Admin only.

**Response: 200 OK**

Same shape as GET /carts/:storeId response.

**Errors**

| Code | HTTP | Condition |
|---|---|---|
| CART_004 | 404 | Cart not found |

---

## Internal Events Consumed (Kafka)

| Topic | Published by | Action |
|---|---|---|
| `order.completed` | Order service | Clear cart by `cartId` |
| `cart.item.out_of_stock` | Order service | Mark items as `out_of_stock` by `cartId` + `unavailableItems[]` |

---

## Internal Events Published (Kafka)

| Topic | Trigger | Payload |
|---|---|---|
| `cart.item.added` | Successful cart-add | `{ cartId, userId, storeId, productId, quantity, productPrice, totalPrice, timestamp }` |