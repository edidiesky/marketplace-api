# Distributed MarketPlace
A Production-grade distributed Distributed Marketplace built on MongoDB, NodeJS, Typescript, and event driven microservice architecture.

## Table of Contents
1. [The Goals of this project](#the-goals-of-this-project)
2. [System Architecture](#system-architecture)
3. [Technologies Used](#technologies--libraries)
4. [Features](#features)
5. [Project Structure](#project-structure)
6. [How to Use it](#how-to-use-it)
7. [API Documentation](#table-of-contents)
8. [Tradeoffs](#table-of-contents)
9. [Monitoring and Observability](#table-of-contents)
10. [Testing Strategy](#testing-strategy)
11. [Performance Bench marks]()
11. [Roadmaps]()


### The Goals of this project:
The essence of me building this project is to show in simple terms on how to build an event driven microservice, and enterprise grade 
applications with core engineering focus on the following:

### **Architectural patterns**
1. **Event-Driven Architecture** with Kafka for asynchronous inter-service communication
1. **CQRS (Command Query Responsibility Segregation)** for read and write optimization
1. **Saga Pattern** for distributed transaction cheoreography
1. **Outbox Pattern** for guaranteed at-least-once event delivery
1. **Inbox Pattern** for idempotent message consumption



### **Distributed Database (MongoDB)**
1. Horizontal sharding with configurable shard count (4 shards)
1. Replication factor of 2 for high availability
1. Worker failure simulation and automatic failover
1. Hot spot detection and shard rebalancing
1. Consistent hashing visualization


### **Real-Time Data Streaming**
1. **Change Data Capture (CDC)** with Debezium capturing all table mutations
1. Kafka as event backbone (3-broker cluster for fault tolerance)
1. Event-driven read model synchronization
1. Audit trail generation from database changelog



### **Production-Ready Infrastructure**
1.  Connection pooling with MongoDB cient (100 max clients, 25 per pool)
1.  Redis for distributed caching and session management
1.  JWT-based authentication with refresh token rotation
1.  Role-based access control (Free vs Premium users)
1.  Rate limiting and abuse prevention using Token buceket based algorithm.


### **Observability & Monitoring**
1.  Full-stack monitoring: **Prometheus + Grafana + Loki + Tempo**
1.  Distributed tracing with OpenTelemetry
1.  Custom Citus metrics (shard sizes, replication lag, hot nodes)
1.  Application metrics (p95 latency, error rates, saga success/failure)
1.  CDC lag monitoring and alerting

### **Payment Integration**
1.  Stripe/Paystack for subscription management
1.  Saga-cheoreography payment workflows with compensating transactions
1.  Webhook handling for subscription lifecycle events
1.  Grace period and invoice generation in near real time.


### **Advanced Analytics**
1. Real-time click tracking with deduplication (unique visitors)
1. Geographic distribution (IP geolocation with MaxMind)
1. Device/browser analytics from user-agent parsing
1. Referral source tracking (UTM parameters, referrer headers)
1. Time-series aggregations (hourly/daily/monthly trends)

### **In Progress**
1.  Custom domain support for premium users
1.  QR code generation for short URLs
1.  Chaos engineering tests (network partitions, Byzantine failures)
1.  Multi-region deployment with geo-routing


## System Architecture


## Technologies Used

1. Languages/Frameworks: NodeJS and Typescript Docker and Kubernetes for containerization.
2. Messaging: Apache Kafka for event streaming.
3. Caching: Redis for in-memory data store.
4. API Management: NGINX as Reverse Proxy, rate limiting via custom middleware.
5. Monitoring: Prometheus for metrics scraping, Grafana for Visualization, Promtail for Log collection and Loki for Logs Visualization.
6. Orchestration: Docker Compose for development, Kubernetes for production.
7. Workflow: Saga pattern for distributed transactions.


## Features

1. Multi-tenant store creation and management.
2. Secure authentication with JWT and Role Based Access Control.
3. Comprehensive product catalog with reviews.
4. Real-time inventory tracking.
5. Seamless payment processing.
6. Event-driven order workflows using Kafka.
7. Caching for performance optimization.
8. Notifications for order status updates.
9. API rate limiting and monitoring.


## Mini Workflow (SAGA Pattern with Kafka)
The platform uses a choreographed Saga pattern for distributed transactions, ensuring consistency across services without a central orchestrator. Kafka topics handle event propagation for critical flows like order processing. Below is a high-level depiction of the order fulfillment workflow:

1. Order Placement (Step 1): User places an order via the Orders Service. The service validates the cart, reserves inventory tentatively, and initiates payment.
2. Payment Processing (Step 2): Orders Service publishes an event to Kafka (e.g., ORDER_CREATED). Payment Service consumes this, processes the payment, and publishes PAYMENT_COMPLETED on success (or PAYMENT_FAILED for rollback).
3. Order Update (Step 3): Orders Service consumes PAYMENT_COMPLETED and updates the order status, publishing ORDER_PAYMENT_COMPLETED.
4. Inventory Update (Step 4): Inventory Service consumes ORDER_PAYMENT_COMPLETED, deducts stock, and publishes STOCK_COUNT_UPDATED (or initiates compensation if stock is insufficient).
5. Stock Confirmation (Step 5): Orders Service consumes STOCK_COUNT_UPDATED to finalize the order.
Notification (Step 6): Notification Service consumes relevant events (e.g., STOCK_COUNT_UPDATED) and sends confirmations to the user and seller.

In a failure scenario, services publish rollback events to undo partial changes, maintaining eventual consistency.


## Getting Started
### Prerequisites

1. Docker and docker-compose installed.
2. Node.js runtime available on yourn Local machine.
3. Kafka and Redis clusters (configured in docker-compose.dev.yml).
4. Environment variables: Set API keys for payments, database connections, etc., in .env files per service.


## Development Setup

1. Clone the repository: git clone <repo-url>.
2. Navigate to the root: cd marketplace-api.
3. Start services: docker-compose -f docker-compose.dev.yml up -d.
4. Access API Gateway at http://localhost:8000.
5. Seed databases: Run migration scripts in each service (e.g., via entrypoints in Dockerfiles).
6. Test endpoints: Use Postman or curl to hit routes like /auth/login, /products, /orders.


## Deployment
For production, use Kubernetes for orchestration. Integrate CI/CD with GitHub Actions or Jenkins. Enable HTTPS via NGINX and monitor with Prometheus/Grafana.