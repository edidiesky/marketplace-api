# ADR-INV-001: MVCC over Redlock for inventory concurrency control

## Context

I needed a way to prevent oversell when multiple orders attempt to reserve the same product simultaneously. The core problem is a classic read-modify-write race: two requests read `quantityAvailable = 10`, both see sufficient stock, both decrement by 5, and the final value is 5 instead of 0. One of those reservations should have failed.

I had two serious options: Redlock distributed locking or MVCC optimistic concurrency.

I initially shipped a raw Redis `SET NX EX` mutex as a placeholder, which is neither of these. Load testing exposed this immediately. At approximately 50 concurrent VUs against a single product, the mutex caused a concurrency cliff: every request that arrived while the lock was held received an immediate 409, retried after a fixed delay, and hit the same contention again. At 80 VUs the service was producing cascading timeouts. The mutex had no retry queue, no backoff, and no jitter. It was a single-try fail-fast mechanism dressed up as a lock. I replaced it.

Before choosing between Redlock and MVCC I need to be honest about what each one actually is and what it costs.

---

## What Redlock actually gives you

Redlock is a distributed mutex algorithm designed by Salvatore Sanfilippo (creator of Redis) for correctness across a cluster of Redis nodes. It acquires locks on a majority quorum of N independent Redis nodes simultaneously. If the process holding the lock crashes, the lock expires automatically via TTL. No other process can acquire the lock until the TTL expires or the holder releases it.

**Redlock is genuinely strong in these situations:**

It is the right tool when you need to prevent any concurrent execution of a critical section across multiple service instances. If you are running three instances of the inventory service and you absolutely cannot have two instances processing a reserve for the same product at the same time, Redlock enforces that at the infrastructure level. The lock is external to the application, so even if instance A is paused by a GC event or a slow network call, instance B cannot acquire the lock and interleave.

It is also the right tool when the critical section involves multiple operations that must appear atomic to external observers and cannot be expressed as a single database predicate. If reserve involved writing to three different collections and the correctness invariant could not be captured in a single `findOneAndUpdate`, a lock would be the cleaner model.

Redlock gives you linearisability: at any point in time, at most one holder is executing the critical section. This is a stronger guarantee than MVCC provides. MVCC allows concurrent reads and concurrent write attempts. It detects conflicts after the fact. Redlock prevents conflicts from happening in the first place.

**The honest costs of Redlock:**

Every reserve, release, and commit operation must acquire and release a lock before touching the database. That is two additional Redis round-trips per operation on the hot checkout path. At 100 concurrent requests for different products this is fine. At 100 concurrent requests for the same product, requests queue behind the lock. The queue depth grows as fast as requests arrive. If the lock TTL is 5 seconds and each operation takes 20ms, the queue can hold 250 requests before the oldest one times out. Under flash-sale conditions this queue becomes your bottleneck.

There is also the fencing token problem. Redlock with a single Redis node does not protect against clock skew or process pauses. If a process acquires the lock, pauses for longer than the TTL (GC pause, kernel scheduling delay), and then resumes, the lock has expired and another process has acquired it. Both processes now believe they hold the lock. Martin Kleppmann documented this extensively. The standard mitigation is a fencing token: a monotonically increasing integer issued with each lock acquisition, passed to the database write, rejected if a higher token has already been seen. I did not implement this. My original Redis NX mutex had none of these protections.

Finally, Redlock as a library requires a Redis cluster of at least 3 independent nodes for the quorum to be meaningful. In my dev environment I run a single Redis instance. The Redlock guarantee collapses on a single node: if Redis restarts between lock acquisition and TTL expiry, the lock is gone and two processes can acquire it simultaneously. In production where Redis is also a single instance this is a real gap.

---

## What MVCC actually gives you

MVCC is an optimistic concurrency pattern. Every document carries a version field (`__v` in Mongoose). A write succeeds only if the version in the query predicate matches the version currently in the database. If another writer committed between my read and my write, the versions diverge, my write returns `null`, and I retry.

**MVCC is genuinely strong in these situations:**

It eliminates lock acquisition entirely. Under low-to-moderate concurrency, where most requests are for different products, there is zero contention. Each request reads and writes its own product document independently. No request waits for another. Latency is determined by the MongoDB round-trip alone.

Under high concurrency on the same product, MVCC distributes retries with exponential backoff and jitter. Requests do not pile up behind a lock. They all attempt writes simultaneously, one succeeds, the rest read the new version and retry. The throughput ceiling is higher because you have N concurrent write attempts instead of a serialised queue.

It also requires no external coordination infrastructure. No Redis quorum. No fencing tokens. No lock TTL to tune. The version field is part of the document and the version check is part of the query predicate, which MongoDB evaluates atomically on the storage engine. The correctness guarantee comes from MongoDB's document-level atomicity, which I already depend on for everything else in this service.

The `$gte` guard on `quantityAvailable` is also atomic within the same `findOneAndUpdate`. So I get two correctness checks in one operation: the version must match and the stock must be sufficient. If either fails, the write does not happen.

**The honest costs of MVCC:**

MVCC does not prevent concurrent execution of the critical section. It detects conflicts after they occur. Under extreme concurrency, N writers can all read the same version, all attempt writes, one succeeds, and N-1 retry. On retry, N-1 writers read the next version, one succeeds, N-2 retry. This is a convergent series but it means every writer except one does at least one wasted read-write cycle per retry. Under a genuine flash sale with thousands of concurrent requests for a single product, retry exhaustion is possible.

MVCC also puts the retry logic in the application layer. If my retry implementation has a bug, two writes can succeed for the same version. Redlock puts the serialisation in the infrastructure layer. Redis is not going to have a bug in its `SET NX` semantics.

There is also a subtlety with `__v` in Mongoose. The `$inc: { __v: 1 }` in the update must be explicit because Mongoose only auto-increments `__v` on `save()` calls, not on `findOneAndUpdate`. If I forget this increment, every write produces the same version and the version guard stops working. I have to own this invariant manually.

---

## Decision

I chose MVCC over Redlock for the inventory service.

The primary reason is the load test result. The Redis NX mutex I had in place caused service collapse at 50 VUs on a single product. Redlock with proper retry would have improved this but the fundamental serialisation problem remains: at high concurrency on a single product, Redlock creates a queue and the queue creates latency that grows linearly with concurrent requests. MVCC does not create a queue. It creates parallel retry attempts that converge.

The secondary reason is infrastructure simplicity. I run a single Redis instance in production. Redlock's quorum guarantee does not apply. I would be paying the cost of distributed locking without getting the theoretical safety guarantee that justifies that cost. MVCC on MongoDB's document atomicity is a cleaner fit for my actual infrastructure.

The third reason is that my correctness requirement can be expressed as a single atomic predicate. The version check and the stock check are both part of the `findOneAndUpdate` query filter. MongoDB evaluates this atomically. I do not need external coordination to make the critical section atomic because the database gives me atomicity at the document level for free.

The specific implementation:

```
MAX_RETRIES = 5
BASE_DELAY_MS = 20
delay = BASE_DELAY_MS * 2^attempt + random(0..20)ms jitter

On each attempt:
  1. Read document including __v
  2. Check precondition (quantityAvailable >= quantity)
  3. findOneAndUpdate with { __v: current.__v, quantityAvailable: { $gte: quantity } }
  4. If null: version conflict, apply delay, retry
  5. If document: success, write reservation key to Redis
  6. After MAX_RETRIES: throw STOCK_CONTENTION
```

---

## Consequences

What I gained: no lock acquisition overhead on the hot checkout path. No single point of serialisation under concurrent load. No dependency on Redis quorum for correctness. Simpler code with no lock acquire/release lifecycle to manage. Load tests showed the concurrency cliff at 50 VUs disappears with MVCC.

What I gave up: linearisability. Two writers can be in the critical section simultaneously. The version guard ensures only one succeeds but both are reading and attempting writes at the same time. For the inventory use case this is acceptable because the correctness invariant (no oversell) is enforced by the atomic predicate, not by preventing concurrent execution.

I also gave up the infrastructure-level safety net. With Redlock, a bug in my application code cannot cause two successful writes for the same document in the same moment. With MVCC, if I forget to increment `__v` in the update, two writers can both succeed against the same version. I own this invariant.

What I now live with: I must ensure `__v` is always incremented in every write that uses the version guard. I added this to the code review checklist for the inventory service. Any new operation that touches inventory quantities must follow the same MVCC pattern. I must also monitor the `inventory_version_conflict` log event in Grafana to detect sustained high-contention scenarios that would indicate approaching retry exhaustion under real load.

If the platform grows to flash-sale scale where thousands of concurrent requests compete for a single product, MVCC retry exhaustion becomes a real concern. At that point the correct solution is a queue-based approach at the application layer: requests for a single product are serialised through a work queue before touching the database. That is a different problem from what I have today and I will address it when the data shows I need to.