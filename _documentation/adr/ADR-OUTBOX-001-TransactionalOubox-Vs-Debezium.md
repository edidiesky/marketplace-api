# ADR-OUTBOX-001: Transactional outbox over Debezium CDC

## Context

I needed a reliable way to publish Kafka events after a database write without losing the event if Kafka is temporarily unavailable. The naive approach of writing to MongoDB and then calling Kafka in the same HTTP handler has a fatal flaw: if Kafka is down or the process crashes between the two operations, the database write succeeds but the event is never published. The system ends up in a split-brain state.

I had two options to solve this.

The transactional outbox pattern means I write the domain document and an `OutboxEvent` record in the same MongoDB `withTransaction`. A separate poller process reads unsent outbox records every 5 seconds, publishes them to Kafka, and marks them sent. The event is guaranteed to eventually be published as long as MongoDB is available, regardless of Kafka availability.

Debezium CDC (Change Data Capture) means I run a Debezium connector that tails the MongoDB oplog and publishes change events to Kafka automatically. No poller needed. Events are published as a side effect of the database write itself.

I evaluated both against my constraints: I am on a 4 GB VPS, I want to avoid running additional infrastructure, and I want the solution to be understandable and debuggable without specialist knowledge.

## Decision

I chose the transactional outbox pattern over Debezium CDC for all critical event publishing on this platform.

I implement it the same way in every service that needs it. The domain write and the `OutboxEvent` document are committed in a single `withTransaction`. A poller running at a 5-second interval queries for unsent outbox records, publishes each one to Kafka using the KafkaJS producer, and updates the record to `sent: true`. The poller runs inside the same service process, not as a separate container.

Services using this pattern: payment (payment confirmation events), products (product onboarding events), and any future service that needs guaranteed event delivery.

## Consequences

What I gained: I do not need to run Debezium, Kafka Connect, or any additional infrastructure. The outbox is simple MongoDB documents I can query, inspect, and replay manually if needed. A Kafka outage queues events in MongoDB rather than failing the write or silently dropping the event. The pattern is easy to understand and debug.

What I gave up: there is a polling delay of up to 5 seconds between the database write and the Kafka publish. This means downstream consumers see events with up to 5 seconds of lag after the source transaction commits. For the use cases on this platform (order completion, stock commit, product sync) this lag is acceptable.

I also gave up the automatic schema evolution and rich change event metadata that Debezium provides. If I need to know what the previous value of a field was before a change, the outbox pattern does not give me that. I would need to store it explicitly in the outbox payload.

What I now live with: the poller is a `setInterval` loop inside the service process. If the service crashes mid-poll after publishing to Kafka but before marking the record as sent, the record will be published again on the next poll cycle. Downstream consumers must be idempotent. I handle this with Redis NX keys per event in every consumer.

The 5-second polling interval is a tunable parameter. If lower latency becomes a requirement I can reduce it, but I would need to watch MongoDB read load on the outbox collection at high throughput.

If the platform outgrows this pattern the natural upgrade path is Debezium with a dedicated Kafka Connect cluster. The outbox table structure is compatible with the Debezium MongoDB connector so the migration would not require changing the domain write logic.