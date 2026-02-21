# Cart Service
event-driven cart management service with inventory reservation, distributed locking, and real-time cache invalidation.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Event System](#event-system)
- [Caching Strategy](#caching-strategy)
- [Error Handling](#error-handling)
- [Monitoring](#monitoring)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Overview

The Cart Service manages shopping cart operations for selleazy platform with features like:

- Inventory reservation to prevent overselling
- Distributed locking for concurrent operation safety
- Event-driven architecture for service coordination
- Versioned caching for optimal performance
- Automatic cart expiration after 30 days of inactivity

## Features

### Core Functionality
- Add items to cart with automatic inventory reservation
- Update item quantities with smart reservation adjustments
- Remove items with automatic inventory release
- View cart contents with real-time availability status
- Automatic cart cleanup on order completion

### Reliability & Performance
- Distributed locking with automatic TTL
- Optimistic concurrency control
- Idempotent operations via idempotency keys
- Redis caching with version-based invalidation
- MongoDB transactions for data consistency

### Integration
- Kafka event publishing for service coordination
- Inventory service integration for stock management
- RESTful API with comprehensive validation

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 
       ▼
┌──────────────────
│   API GATEWAY    │
└──────┬───────────
       │
       │ HTTP
       ▼
┌─────────────────────────────────────────┐
│          Cart Service                    │
│                                          │
│  ┌──────────────┐    ┌──────────────┐  │
│  │ Controllers  │───▶│  Services    │  │
│  └──────────────┘    └───────┬──────┘  │
│                              │          │
│  ┌──────────────┐    ┌───────▼──────┐  │
│  │  Validators  │    │ Repositories │  │
│  └──────────────┘    └───────┬──────┘  │
└────────────────────────────┬─┴─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │  MongoDB │        │  Redis   │        │  Kafka   │
  │  (Data)  │        │ (Cache)  │        │ (Events) │
  └──────────┘        └──────────┘        └──────────┘
        │
        │ Inventory Check/Reserve
        ▼
  ┌──────────────────┐
  │ Inventory Service│
  └──────────────────┘
```

### Data Flow

**Add to Cart:**
```
1. Validate request
2. Acquire distributed lock
3. Reserve inventory (Inventory Service)
4. Create/update cart in MongoDB (transaction)
5. Invalidate inventory cache
6. Update cart cache
7. Publish cart.item.added event
8. Release lock
9. Return cart to client
```

**Update Quantity:**
```
1. Calculate quantity delta (new - old)
2. If increasing: Reserve additional inventory
3. If decreasing: Release excess inventory
4. Update cart in MongoDB (transaction)
5. Invalidate caches
6. Publish cart.item.updated event
7. Return updated cart
```

## Prerequisites

- **Node.js**: >= 18.x
- **MongoDB**: >= 5.0 (with replica set for transactions)
- **Redis**: >= 6.0
- **Kafka**: >= 2.8
- **Inventory Service**: Must be deployed with reservation endpoints

## Installation

```bash
# Clone repository
git clone https://github.com/yourorg/cart-service.git
cd cart-service

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure environment variables
nano .env
```

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=4007
NODE_ENV=production

# MongoDB Configuration
MONGODB_URI=mongodb://mongo:27017/cart-service
MONGODB_REPLICA_SET=rs0

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Kafka Configuration
KAFKA_BROKERS=kafka-1:9092,kafka-2:9093,kafka-3:9094
KAFKA_CLIENT_ID=cart-service
KAFKA_GROUP_ID=cart-service-group

# Inventory Service Configuration
INVENTORY_SERVICE_URL=http://inventory:4008

# Cache Configuration
CART_CACHE_TTL=60          # Cart cache TTL in seconds
INVENTORY_CACHE_TTL=60     # Inventory cache TTL in seconds

# Lock Configuration
LOCK_TTL=30                # Distributed lock TTL in seconds

# Cart Configuration
CART_EXPIRY_DAYS=30        # Auto-delete inactive carts after N days

# Feature Flags
ENABLE_INVENTORY_RESERVATION=true
ENABLE_EVENT_PUBLISHING=true
ENABLE_CACHE_INVALIDATION=true

# Logging
LOG_LEVEL=info             # debug | info | warn | error
```

### Kafka Topics

Ensure these topics exists in the Kafka Broker before starting the service:

```bash
# Cart Events (Published by this service)
cart.item.added
cart.item.updated
cart.item.removed
cart.cleared

# Order Events (Consumed by this service)
order.completed
cart.item.out_of_stock
```

### MongoDB Indexes

```javascript
// Required indexes
db.carts.createIndex({ userId: 1, storeId: 1 }, { unique: true });
db.carts.createIndex({ storeId: 1 });
db.carts.createIndex({ sellerId: 1 });
db.carts.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
db.carts.createIndex({ createdAt: -1 });
```

## API Reference

### Base URL
```
http://localhost:4007/api/v1/cart
```

### Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

### Add Item to Cart

**POST** `/api/v1/cart/:storeId/store`

Add a product to the user's cart or update quantity if already exists.

**Request Body:**
```json
{
  "productId": "507f1f77bcf86cd799439011",
  "productTitle": "Wireless Headphones",
  "productImage": "https://example.com/image.jpg",
  "productPrice": 79.99,
  "productDescription": "Premium wireless headphones",
  "quantity": 2,
  "email": "user@example.com",
  "sellerId": "507f1f77bcf86cd799439012",
  "idempotencyKey": "unique-request-id-123"
}
```

**Response (201):**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "userId": "507f1f77bcf86cd799439014",
  "storeId": "507f1f77bcf86cd799439015",
  "sellerId": "507f1f77bcf86cd799439012",
  "fullName": "John Doe",
  "quantity": 2,
  "totalPrice": 159.98,
  "cartItems": [
    {
      "productId": "507f1f77bcf86cd799439011",
      "productTitle": "Wireless Headphones",
      "productImage": ["https://example.com/image.jpg"],
      "productPrice": 79.99,
      "productQuantity": 2,
      "productDescription": "Premium wireless headphones",
      "availabilityStatus": "available",
      "reservedAt": "2026-01-27T10:30:00.000Z"
    }
  ],
  "expireAt": "2026-02-26T10:30:00.000Z",
  "version": 1,
  "createdAt": "2026-01-27T10:30:00.000Z",
  "updatedAt": "2026-01-27T10:30:00.000Z"
}
```

**Response (200) - Insufficient Stock:**
```json
{
  "message": "Insufficient stock. Only 1 available."
}
```

**Error Responses:**
- `400` - Validation error
- `409` - Operation already in progress (duplicate request)
- `500` - Server error

---

### Get User's Cart

**GET** `/api/v1/cart/:storeId/store`

Retrieve the authenticated user's cart for a specific store.

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "userId": "507f1f77bcf86cd799439014",
  "storeId": "507f1f77bcf86cd799439015",
  "cartItems": [...],
  "quantity": 3,
  "totalPrice": 239.97,
  "expireAt": "2026-02-26T10:30:00.000Z"
}
```

**Response (404):**
```json
{
  "message": "Cart not found"
}
```

---

### Update Cart Item Quantity

**PUT** `/api/v1/cart/:id`

Update the quantity of an item in the cart.

**Request Body:**
```json
{
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 5
}
```

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "cartItems": [...],
  "quantity": 5,
  "totalPrice": 399.95,
  "version": 2
}
```

**Behavior:**
- If `quantity` > current: Reserves additional inventory
- If `quantity` < current: Releases excess inventory
- If `quantity` = 0: Use delete endpoint instead

**Error Responses:**
- `400` - Missing productId or quantity
- `404` - Cart or item not found
- `500` - Insufficient inventory or server error

---

### Remove Item from Cart

**DELETE** `/api/v1/cart/:id`

Remove a product from the cart.

**Request Body:**
```json
{
  "productId": "507f1f77bcf86cd799439011"
}
```

**Response (200):**
```json
{
  "message": "Item removed from cart"
}
```

**Error Responses:**
- `400` - Missing productId
- `404` - Cart not found
- `500` - Server error

---

### Get All Carts (Admin)

**GET** `/api/v1/cart/:storeId/admin/carts`

Retrieve all carts for a store with pagination.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)

**Response (200):**
```json
{
  "data": {
    "carts": [...],
    "totalCount": 150,
    "totalPages": 15
  },
  "success": true,
  "statusCode": 200
}
```

---

### Get Single Cart by ID (Admin)

**GET** `/api/v1/cart/:id`

Retrieve a specific cart by its MongoDB ObjectId.

**Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "userId": "507f1f77bcf86cd799439014",
  ...
}
```

**Response (404):**
```json
{
  "message": "Cart not found"
}
```

## Event System

### Published Events

#### cart.item.added
Published when an item is added to cart or quantity is increased.

```json
{
  "cartId": "507f1f77bcf86cd799439013",
  "userId": "507f1f77bcf86cd799439014",
  "storeId": "507f1f77bcf86cd799439015",
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 2,
  "productPrice": 79.99,
  "totalPrice": 159.98,
  "sagaId": "cart-1706356200000-user-123-product-456",
  "timestamp": "2026-01-27T10:30:00.000Z"
}
```

**Consumers:**
- Inventory Service: Track reservations
- Analytics Service: Monitor cart behavior
- Recommendation Service: Trigger suggestions

#### cart.item.updated
Published when item quantity is modified.

#### cart.item.removed
Published when item is removed from cart.

#### cart.cleared
Published when entire cart is deleted (e.g., after order completion).

### Consumed Events

#### order.completed
Triggers cart cleanup after successful order.

```json
{
  "cartId": "507f1f77bcf86cd799439013",
  "userId": "507f1f77bcf86cd799439014",
  "storeId": "507f1f77bcf86cd799439015",
  "orderId": "507f1f77bcf86cd799439016"
}
```

**Actions:**
1. Release all inventory reservations
2. Delete cart document
3. Log completion

#### cart.item.out_of_stock
Marks cart items as unavailable without removing them.

```json
{
  "cartId": "507f1f77bcf86cd799439013",
  "unavailableItems": [
    {
      "productId": "507f1f77bcf86cd799439011",
      "reason": "Out of stock"
    }
  ],
  "sagaId": "inventory-check-123"
}
```

**Actions:**
1. Update item `availabilityStatus` to `out_of_stock`
2. Set `unavailabilityReason`
3. Invalidate cart cache
4. Notify user (via frontend polling)

## Caching Strategy

### Cart Cache

**Key Pattern:** `Cart:{storeId}:{userId}:v{version}`

**Strategy:** Version-based caching
- Each cart modification increments version
- Old version becomes stale automatically
- No manual invalidation needed for cart data

**TTL:** 60 seconds (configurable)

**Example:**
```
Cart:store-123:user-456:v1  → { ... cart data ... }
Cart:store-123:user-456:latest_version → "1"

// After update:
Cart:store-123:user-456:v2  → { ... updated cart ... }
Cart:store-123:user-456:latest_version → "2"
```

### Inventory Cache

**Key Pattern:** `inventory:{storeId}:{productId}`

**Strategy:** Cache-aside with proactive invalidation
- Cached on first read
- Invalidated on every cart operation affecting that product
- Next read fetches fresh data from Inventory Service

**TTL:** 60 seconds (configurable)

### Lock Keys

**Key Pattern:** `cart:add:{storeId}:{userId}:{productId}:{idempotencyKey}`

**TTL:** 30 seconds (prevents permanent locks)

**Cleanup:** Automatic via TTL + explicit release in finally block

## Error Handling

### Error Types

#### Validation Errors (400)
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "quantity",
      "message": "Quantity must be between 1 and 100"
    }
  ]
}
```

#### Not Found Errors (404)
```json
{
  "message": "Cart not found"
}
```

#### Inventory Errors (400/500)
```json
{
  "message": "Insufficient stock. Only 3 available."
}
```

#### Concurrent Operation Errors (409)
```json
{
  "message": "Cart operation already in progress"
}
```

### Retry Strategy

**Client-side:**
- Retry on 500 errors with exponential backoff
- Don't retry on 400 errors (validation failures)
- Safe to retry with same idempotency key

**Service-side:**
- MongoDB transactions auto-retry on transient errors
- Kafka producer has built-in retry logic
- Inventory service calls timeout after 5s

## Monitoring

### Key Metrics

**Application Metrics:**
```
cart.operation.duration          - Histogram (ms)
cart.operation.count             - Counter (by operation type)
cart.operation.errors            - Counter (by error type)
cart.lock.acquisition.success    - Counter
cart.lock.acquisition.failure    - Counter
cart.inventory.reservation.success - Counter
cart.inventory.reservation.failure - Counter
cart.event.publish.success       - Counter
cart.event.publish.failure       - Counter
cart.cache.hit                   - Counter
cart.cache.miss                  - Counter
```

**Business Metrics:**
```
cart.items.total                 - Gauge
cart.value.total                 - Gauge (in currency)
cart.abandonment.rate            - Gauge (%)
cart.conversion.rate             - Gauge (%)
```

### Health Checks

**GET** `/health`

```json
{
  "status": "healthy",
  "timestamp": "2026-01-27T10:30:00.000Z",
  "services": {
    "mongodb": "connected",
    "redis": "connected",
    "kafka": "connected",
    "inventory": "reachable"
  },
  "version": "2.0.0"
}
```

### Logging

**Log Levels:**
- `DEBUG`: Cache hits/misses, lock operations
- `INFO`: Successful operations, events published
- `WARN`: Cache failures, inventory service slow responses
- `ERROR`: Operation failures, critical issues

**Structured Logging Example:**
```json
{
  "level": "info",
  "message": "Cart item added",
  "event": "cart_item_added",
  "userId": "507f1f77bcf86cd799439014",
  "productId": "507f1f77bcf86cd799439011",
  "quantity": 2,
  "sagaId": "cart-1706356200000-user-123-product-456",
  "timestamp": "2026-01-27T10:30:00.000Z"
}
```

## Development

### Local Setup

```bash
# Start dependencies with Docker Compose
docker-compose up -d mongodb redis kafka

# Run in development mode
npm run dev

# Run with hot reload
npm run dev:watch
```

### Code Structure

```
src/
├── config/
│   ├── kafka.ts          # Kafka producer configuration
│   └── redis.ts          # Redis client configuration
├── controllers/
│   └── cart.controller.ts    # Request handlers
├── services/
│   └── cart.service.ts       # Business logic
├── repositories/
│   ├── ICartRepository.ts    # Repository interface
│   └── CartRepository.ts     # Data access layer
├── models/
│   └── Cart.ts              # MongoDB schema
├── middleware/
│   ├── auth.middleware.ts   # JWT authentication
│   └── validate.middleware.ts # Request validation
├── validators/
│   └── cart.validation.ts   # Joi schemas
├── subscribers/
│   └── cart.subscriber.ts   # Kafka event consumers
├── types/
│   └── index.ts            # TypeScript types
├── utils/
│   ├── logger.ts           # Winston logger
│   ├── connectDB.ts        # MongoDB connection
│   └── metrics.ts          # Prometheus metrics
├── constants.ts            # Constants and configs
└── app.ts                 # Express app setup
```

### Adding New Features

1. **Add endpoint:**
   - Create handler in `cart.controller.ts`
   - Add validation schema in `cart.validation.ts`
   - Define route in `routes/cart.routes.ts`

2. **Add business logic:**
   - Implement in `cart.service.ts`
   - Consider inventory impact
   - Publish relevant events

3. **Update tests:**
   - Unit tests in `__tests__/unit/`
   - Integration tests in `__tests__/integration/`

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- cart.service.test.ts

# Watch mode
npm test -- --watch
```

### Integration Tests

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration

# Cleanup
docker-compose -f docker-compose.test.yml down -v
```

### Test Coverage Requirements

- Unit tests: > 80%
- Integration tests: Critical paths covered
- E2E tests: Happy path + error scenarios

### Example Test

```typescript
describe('CartService', () => {
  describe('createCart', () => {
    it('should reserve inventory before adding item', async () => {
      // Arrange
      const mockReserve = jest.spyOn(inventoryService, 'reserve')
        .mockResolvedValue({ success: true, reservationId: '123' });

      // Act
      const result = await cartService.createCart(userId, {
        productId: 'prod-123',
        quantity: 2,
        // ... other fields
      });

      // Assert
      expect(mockReserve).toHaveBeenCalledWith({
        storeId: expect.any(String),
        productId: 'prod-123',
        quantity: 2,
        userId,
        sagaId: expect.any(String),
        reservationType: 'cart'
      });
      expect(result).toHaveProperty('_id');
      expect(result.cartItems).toHaveLength(1);
    });

    it('should release lock on error', async () => {
      // Arrange
      jest.spyOn(inventoryService, 'reserve')
        .mockRejectedValue(new Error('Service unavailable'));
      const mockDelLock = jest.spyOn(redisClient, 'del');

      // Act & Assert
      await expect(
        cartService.createCart(userId, { /* ... */ })
      ).rejects.toThrow();

      expect(mockDelLock).toHaveBeenCalled();
    });
  });
});
```

## Deployment

### Docker

```bash
# Build image
docker build -t cart-service:2.0.0 .

# Run container
docker run -d \
  --name cart-service \
  -p 4007:4007 \
  --env-file .env \
  cart-service:2.0.0
```

### Kubernetes

```bash
# Apply configurations
kubectl apply -f k8s/cart-service-deployment.yaml
kubectl apply -f k8s/cart-service-service.yaml
kubectl apply -f k8s/cart-service-configmap.yaml
kubectl apply -f k8s/cart-service-secrets.yaml

# Check status
kubectl rollout status deployment/cart-service

# View logs
kubectl logs -f deployment/cart-service
```

### Environment-specific Configurations

**Development:**
- Single replica
- Debug logging
- Local dependencies

**Staging:**
- 2-3 replicas
- Info logging
- Shared dependencies
- Integration tests before deployment

**Production:**
- 5+ replicas
- Warn/Error logging
- HA dependencies
- Blue-green deployment
- Canary testing

## Troubleshooting

### Common Issues

#### 1. "Cart operation already in progress"

**Cause:** Duplicate requests or stuck lock

**Solution:**
```bash
# Check for stuck locks
redis-cli KEYS "cart:add:*"

# Delete specific lock
redis-cli DEL "cart:add:{storeId}:{userId}:{productId}:{idempotencyKey}"

# Wait for TTL (30s) or retry with new idempotency key
```

#### 2. "Unable to reserve inventory"

**Cause:** Inventory service unreachable or insufficient stock

**Solution:**
```bash
# Check inventory service
curl http://inventory:4008/health

# Check inventory for product
curl http://inventory:4008/api/v1/inventories/check/{productId}?storeId={storeId}

# Check service logs
kubectl logs deployment/inventory-service
```

#### 3. High cache miss rate

**Cause:** TTL too short or frequent invalidations

**Solution:**
```bash
# Check cache stats
redis-cli INFO stats

# Increase TTL in environment variables
CART_CACHE_TTL=120

# Monitor after change
```

#### 4. Kafka event publishing failures

**Cause:** Kafka unavailable or topic missing

**Solution:**
```bash
# Check Kafka connection
kubectl exec -it cart-service-pod -- curl kafka-1:9092

# List topics
kafka-topics.sh --list --bootstrap-server kafka-1:9092

# Create missing topic
kafka-topics.sh --create \
  --bootstrap-server kafka-1:9092 \
  --topic cart.item.added \
  --partitions 3 \
  --replication-factor 2
```

#### 5. MongoDB transaction failures

**Cause:** Replica set not configured or network issues

**Solution:**
```bash
# Check replica set status
mongo --eval "rs.status()"

# Ensure MongoDB URI includes replica set
MONGODB_URI=mongodb://mongo:27017/cart-service?replicaSet=rs0

# Check connectivity
kubectl exec -it cart-service-pod -- nc -zv mongo 27017
```

### Debug Mode

Enable debug logging:

```bash
# Set environment variable
LOG_LEVEL=debug

# Or via API
curl -X POST http://localhost:4007/admin/log-level \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"level": "debug"}'
```

### Performance Profiling

```bash
# Enable profiling
NODE_ENV=production node --prof app.js

# Generate profile
node --prof-process isolate-*.log > profile.txt

# Analyze
less profile.txt
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Coding Standards

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with Airbnb config
- **Formatting**: Prettier
- **Commits**: Conventional Commits format

### Pull Request Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] No console.logs
- [ ] Types defined
- [ ] Error handling added
- [ ] Metrics/logging added

## License

MIT License - see LICENSE file for details

## Related Services

- **Inventory Service:** Manages product stock and reservations
- **Order Service:** Processes cart checkout
- **Product Service:** Provides product information
- **User Service:** Manages user authentication
