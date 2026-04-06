# ADR-SAGA-001: Choreography over orchestration for distributed transactions

## Context

I needed a way to coordinate a multi-step distributed transaction across services: registration triggers tenant provisioning, payment confirmation triggers stock commit, stock commit triggers cart clearout and notification. Each step lives in a different service with its own database.

I had two options.

Orchestration means I build a central saga orchestrator that calls each service in sequence, tracks state, and issues compensations when something fails. Tools like Temporal or a custom state machine in a dedicated service do this. The orchestrator knows the full flow and drives it.

Choreography means each service listens for events on Kafka, does its local work, and publishes the next event. No service knows the full flow. Services react to what they hear. Compensations are also event-driven.

I evaluated both against my constraints: I am running this on a single 4 GB VPS, I want to keep the service count low, and I want each service to be independently deployable without coordinating with a central brain.

## Decision

I chose choreography for all distributed transactions across this platform.

Every service is a Kafka consumer and producer. Each service owns its local transaction, publishes the result, and the next service in the chain reacts. Compensation runs in reverse: if inventory reservation fails for item N, I release items 0..N-1 and emit `order.reservation.failed.topic`. The orders service reacts to that and moves the order to `OUT_OF_STOCK`.

I do not have a saga orchestrator service. There is no central state machine tracking saga progress.

## Consequences

What I gained: each service is fully autonomous. I can deploy, restart, or scale any service without touching any other. There is no single orchestrator that becomes a bottleneck or a single point of failure. Adding a new step to a saga means adding a new consumer, not modifying a central orchestrator.

What I gave up: the full saga flow is not visible in one place. To understand what happens when a payment is confirmed I have to read five different consumer files across five services. Debugging a failed saga requires correlating events across Kafka topics by `orderId` or `traceId`. This is harder than reading a single orchestrator log.

What I now live with: I rely heavily on OTEL trace propagation across Kafka message headers to stitch together the full saga trace in Tempo. Without that I would be flying blind. I also rely on each service's idempotency guarantees being correct because there is no central authority replaying steps.

A choreography-based saga is harder to reason about at scale. If this platform grows to 20+ services I would revisit this and consider Temporal for the most complex flows. At the current scale choreography is the right call.