# Inventory Service: Architecture Tradeoffs & Performance Analysis

## Table of Contents
- [Tradeoffs](#inventory-service-tradeoffs)
- [Order Service Tradeoffs](#order-service-tradeoffs)
- [Cross-Service Tradeoffs](#cross-service-tradeoffs)
- [Performance Impact Analysis](#performance-impact-analysis)
- [Key Performance Metrics](#key-performance-metrics)
- [Cost Considerations](#cost-considerations)
- [Scalability Analysis](#scalability-analysis)
- [Alternative Approaches](#alternative-approaches)
- [Recommendations](#recommendations)

---


## Architecture Overview

Both services implement a **reservation-based inventory system** with **event-driven saga orchestration** to prevent overselling while maintaining data consistency across distributed services.

### Key Tradeoffs Summary

| Aspect | Benefit | Cost |
|--------|---------|------|
| **Stock Reservation** | Prevents overselling | +50-100ms latency per operation |
| **Distributed Locking** | Prevents race conditions | Serializes operations, reduces throughput |
| **Data Invariants** | Guaranteed consistency | +20ms validation overhead |
| **Event-Driven Saga** | Loose coupling, scalability | Eventual consistency, complex debugging |
| **Idempotency** | Safe retries | Redis memory overhead, +5ms per check |
| **Rollback Mechanism** | All-or-nothing semantics | 2x operations on failure paths |

---

## Tradeoffs

### 1. Stock Reservation System

#### Advantages

**Prevents Overselling:**
- Items reserved in cart cannot be sold to others
- Guarantees availability through checkout
- Critical for limited inventory (< 1000 units)

**Better User Experience:**
- No "out of stock" surprises at checkout
- Reduces cart abandonment
- Users trust the system

**Data Consistency:**
- Inventory and cart always in sync
- Clear separation: available vs reserved
- Audit trail of all reservations

#### Disadvantages

**Artificial Stock Shortages:**
- Reserved items unavailable to others
- Cart abandonment holds stock for 30 minutes
- 10% abandonment rate × 1000 carts = 100-500 items locked

**Increased Complexity:**
- Reserve → Commit/Release workflow
- Rollback logic required
- Orphaned reservation cleanup needed

**Performance Overhead:**
```
Without Reservation:
 * Check stock: 5ms (cache hit)
 * Update cart: 30ms
 * Total: 35ms

With Reservation:
 * Acquire lock: 3ms
 * Check idempotency: 5ms
 * Reserve stock (MongoDB): 50ms
 * Invalidate cache: 2ms
 * Release lock: 2ms
 * Total: 62ms (+77% overhead)
```

**Latency Breakdown (Reserve Operation):**
```
Total: 62ms
* Lock acquisition:     3ms   (4.8%)
* Idempotency check:    5ms   (8.1%)
* MongoDB transaction: 50ms  (80.6%)
* Cache invalidation:   2ms   (3.2%)
* Lock release:         2ms   (3.2%)
```

####  Metrics to Monitor

```
inventory_reserve_duration_seconds
  Target: p95 < 150ms, p99 < 300ms
  
inventory_artificial_shortage_rate
  = (quantityReserved / quantityOnHand) * 100
  Target: < 30%
  
inventory_reservation_timeout_rate
  = expired_reservations / total_reservations
  Target: < 5% (indicates cart abandonment)
```

####  When to Use

**Use Reservation System When:**
- High-value items (> $50)
- Limited stock (< 1000 units per product)
- Flash sales or limited editions
- Legal/regulatory requirements

**Don't Use Reservation System When:**
- Digital products (unlimited inventory)
- Very high throughput (> 10K RPS)
- Low-value items (< $10)
- Abundant stock (> 10,000 units)

---

### 2. Distributed Locking (Redis)

#### Advantages

**Prevents Race Conditions:**
```
Without Lock:
T1: User A reads stock: 5 available
T2: User B reads stock: 5 available
T3: User A reserves 5
T4: User B reserves 5
T5: Stock = -5 (oversold!)

With Lock:
T1: User A acquires lock
T2: User B waits
T3: User A reserves 5 → stock = 0
T4: User A releases lock
T5: User B acquires lock
T6: User B tries to reserve 5 → fails (stock = 0)
```

**Idempotency Enforcement:**
- Same sagaId cannot acquire lock twice
- Cached result returned on duplicate
- Network retries safe

**Data Integrity:**
- Serializes writes to same product
- Prevents concurrent modification bugs
- MongoDB transactions protected by lock

#### Disadvantages

**Performance Bottleneck:**
```
Scenario: 100 concurrent users add same product to cart

Without Lock: 100 operations × 50ms = 50ms (parallel)
With Lock: 100 operations × 50ms = 5000ms (serial)

Effective throughput: 20 ops/sec (vs 2000 ops/sec without lock)
```

**Lock Contention:**
```
Lock Held: 50-150ms (transaction duration)
TTL: 30 seconds

At 100 RPS on same product:
- 5-15 requests waiting per lock cycle
- Queue builds up quickly
- Timeout risk increases
```

**Lock Granularity Tradeoff:**
```
Too Coarse (by store):
 * Lock: "store-123"
 * Blocks ALL products in store
 * Throughput: ~10 RPS

Current (by product):
 * Lock: "store-123:product-456"
 * Only blocks same product
 * Throughput: ~20 RPS per product

Too Fine (by user + product):
 * Lock: "store-123:product-456:user-789"
 * No blocking between users
 * But: Race conditions possible!
 * Throughput: ~2000 RPS
```

####  Metrics to Monitor

```
inventory_lock_acquisition_duration_seconds
  Target: p95 < 10ms
  
inventory_lock_contention_rate
  = (requests_waiting / total_requests) * 100
  Target: < 10%
  
inventory_lock_timeout_total
  Target: 0 (indicates operations slower than TTL)
  
inventory_lock_held_duration_seconds
  Target: p95 < 150ms
```

####  Alternative Approaches

**Optimistic Locking (No Redis Lock):**
```typescript
// MongoDB version field
const result = await Inventory.findOneAndUpdate(
  {
    productId,
    storeId,
    version: currentVersion,  // Only update if version matches
    quantityAvailable: { $gte: quantity }
  },
  {
    $inc: {
      quantityAvailable: -quantity,
      quantityReserved: +quantity,
      version: 1
    }
  }
);

if (!result) {
  // Version mismatch or insufficient stock* retry
  throw new ConcurrentModificationError();
}
```

**Tradeoffs:**
- No Redis dependency
- Better concurrency (no blocking)
- Simpler infrastructure
- Client must implement retry logic
- More database roundtrips on conflicts
- Wasted work on failed attempts

---

### 3. Data Invariant Validation

#### The Golden Rule
```
quantityOnHand = quantityAvailable + quantityReserved
```

#### Advantages

**Guaranteed Consistency:**
- Impossible to have data corruption
- System fails loudly instead of silently
- Catches bugs immediately

**Debugging Aid:**
- When invariant fails, exact cause known
- Full context logged
- Easy to trace root cause

**Compliance:**
- Audit trail of all quantity changes
- Provable accuracy for accounting
- Legal protection

#### Disadvantages

**Performance Overhead:**
```
Per Operation:
- Validate before: 1ms
- Perform operation: 50ms
- Validate after: 1ms
- Total overhead: 2ms (~4% of operation time)
```

**Blocks Valid Operations:**
```
Scenario: Admin wants to adjust quantityOnHand

Current stock:
  quantityOnHand: 100
  quantityAvailable: 80
  quantityReserved: 20

Admin wants to set quantityOnHand to 110 (received new shipment)

But: 110 != 80 + 20
Validation BLOCKS this operation!

Workaround needed:
  quantityOnHand: 110
  quantityAvailable: 90   // Must also adjust
  quantityReserved: 20    // Unchanged
```

**False Positives:**
- Clock skew between services
- In-flight transactions
- Race conditions in cleanup jobs

####  Metrics to Monitor

```
inventory_invariant_violations_total
  Target: 0 ALWAYS
  Alert: CRITICAL if > 0
  
inventory_invariant_check_duration_seconds
  Target: p95 < 5ms
```

---

### 4. Idempotency via Redis

#### Advantages

**Safe Retries:**
```
Request 1: Reserve 10 items (network timeout)
Request 2: Retry with same sagaId
Result: Only 10 reserved, not 20
```

**Duplicate Request Protection:**
- Payment gateway sends same event twice
- Only processed once
- Prevents double-charging

**Cached Results:**
- Duplicate request returns in ~5ms
- No database hit
- Lower load on system

#### Disadvantages

**Memory Overhead:**
```
Per Idempotency Key:
- Key: ~100 bytes
- Value: ~1KB (cached result)
- TTL: 1 hour
- Total: ~1.1KB per operation

At 1000 RPS:
- Per hour: 1000 × 3600 × 1.1KB = 3.96 GB
- Redis memory: 4+ GB needed just for idempotency
```

**TTL Management:**
```
Too Short (10 minutes):
 * Risk of duplicate processing
 * Network delays can exceed TTL
  
Current (1 hour):
 * Safe for most scenarios
 * Higher memory cost
  
Too Long (24 hours):
 * Very safe
 * Memory cost prohibitive
```

**Cache Invalidation:**
- Keys never explicitly deleted
- Relies on TTL expiry
- No active cleanup
- Memory grows until TTL expires

####  Metrics to Monitor

```
inventory_idempotency_cache_hits_total
  = duplicate_requests_rejected
  Higher is better (shows system working)
  
inventory_idempotency_check_duration_seconds
  Target: p95 < 10ms
  
redis_memory_idempotency_keys_bytes
  Target: < 5GB
```

---

### 5. Rollback Mechanism

#### Advantages

**All-or-Nothing Semantics:**
```
Order: 5 items
Reserve: Item 1
Reserve: Item 2
Reserve: Item 3 (out of stock)

Without Rollback:
 * Items 1 & 2 still reserved
 * Order fails
 * Stock artificially locked
  
With Rollback:
 * Items 1 & 2 automatically released
 * Order fails cleanly
 * Stock immediately available
```

**Data Consistency:**
- No orphaned reservations
- Inventory always accurate
- Reduces manual cleanup

**User Experience:**
- Clear error messages
- All-or-nothing: user knows exactly what failed
- Can retry immediately

#### Disadvantages

**Performance Cost:**
```
Successful Path:
  Reserve A: 50ms
  Reserve B: 50ms
  Reserve C: 50ms
  Total: 150ms

Failed Path with Rollback:
  Reserve A: 50ms
  Reserve B: 50ms
  Reserve C: 50ms (fails)
  Release A: 50ms
  Release B: 50ms
  Total: 250ms (+67% overhead)
```

**Cascading Delays:**
```
Batch Reservation: 10 items

Item 9 fails:
 * Already spent: 8 × 50ms = 400ms
 * Rollback cost: 8 × 50ms = 400ms
 * Total wasted: 800ms
  
User waits 800ms to see "Item 9 out of stock"
```

**Rollback Can Fail:**
```
Reserve:
[Network partition]
Rollback: (can't reach inventory service)

Result: Orphaned reservation!
Need: Cleanup job to find and release
```

####  Metrics to Monitor

```
inventory_rollback_attempts_total
  Track: Frequency of failures
  
inventory_rollback_success_rate
  Target: 100%
  Alert: < 99% (means orphaned reservations)
  
inventory_rollback_duration_seconds
  Target: p95 < 500ms for 10-item batch
  
inventory_orphaned_reservations_total
  Target: 0
  Cleanup: Daily job if > 0
```

---