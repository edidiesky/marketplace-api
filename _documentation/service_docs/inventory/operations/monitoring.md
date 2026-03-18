# Monitoring: Inventory Service

**Owner:** Inventory service team
**Last updated:** 2026-03-17

---

## SLOs

| Metric | Target |
|---|---|
| `POST /reserve` p99 latency | < 300ms |
| `POST /commit` p99 latency | < 300ms |
| `GET /check/:productId` p99 latency | < 100ms |
| Inventory service availability | 99.9% |
| Kafka consumer lag (`Inventory-group`) | < 500 messages |
| Reservation expiry worker cycle time | < 60s |

---

## Key Metrics

| Metric | Type | Description |
|---|---|---|
| `inventory_request_duration_seconds` | Histogram | HTTP request latency by route and status |
| `inventory_reserve_total` | Counter | Successful stock reservations |
| `inventory_reserve_failed_total` | Counter | Failed reservations (insufficient stock or contention) |
| `inventory_commit_total` | Counter | Successful stock commits |
| `inventory_release_total` | Counter | Successful stock releases |
| `inventory_contention_total` | Counter | Redis lock contention events |
| `inventory_low_stock_total` | Gauge | Count of products where `isLowStock = true` |
| `inventory_orphaned_reservations_released_total` | Counter | Reservations released by TTL expiry worker |
| `inventory_kafka_consumer_lag` | Gauge | Kafka consumer group lag for `Inventory-group` |
| `inventory_kafka_processing_errors_total` | Counter | Messages sent to DLQ |

---

## Dashboards

All dashboards are in Grafana under the `inventory-service` folder.

- **Inventory Overview** - request rate, error rate, p50/p95/p99 latency per route
- **Stock Health** - low stock product count, reservation rate vs commit rate, orphaned release rate
- **Kafka Consumer** - consumer lag, DLQ depth, processing errors

---

## Alerts

| Alert | Condition | Severity |
|---|---|---|
| InventoryHighContention | `inventory_contention_total` rate > 10/min | Warning |
| InventoryInsufficientStockSpike | `inventory_reserve_failed_total` rate > 20/min | Warning |
| InventoryKafkaLagHigh | Consumer lag > 500 for `Inventory-group` | Warning |
| InventoryDLQGrowing | DLQ message count increasing | Critical |
| InventoryLowStockHigh | `inventory_low_stock_total` > 10 products | Warning |
| InventoryOrphanedReleaseSpike | `inventory_orphaned_reservations_released_total` > 5 in one worker cycle | Warning |
| InventoryRedisDown | Redis ping failing | Critical |
| InventoryMongoDown | MongoDB connection error | Critical |