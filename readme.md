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
###

## Technologies & Libraries

### Core Stack.
1. **Node.js version 20**: The main runtime environment
2. **Typescript version 5**: For typesafe environment
1. **Express 4.18** : Web framework
1. **Citus 13.0.3** : Distributed PostgreSQL
1. **Redis 7.0** : In memory cache and session store
1. **Apache Kafka 3.6** : Event streaming platform

### **Database Layer**
1. **nodejs postgress (pg)**: PostgreSQL client with connection pooling
1. **Debezium version 2.4**: My main change data capture connector
1. **pg bouncer**: For connection pooling ( helps me to create resusauble TCP connection to the database server)
1. **ioredis)**: A redis client that supports also cluster mode


### **Authentication & Security**
1. **jsonwebtoken**: Mainly used to generate JWT tokens and also for token verification.
1. **bcrypt**: Used to generate non reversible hash content for password.
1. **helmet** :Security headers middleware
1. **express.rate-limit** : DDoS protection

### **Monitoring & Observability**
1. **Prometheus** Metrics collection
1. **Grafana** Visualization dashboards
1. **Loki** Log aggregation
1. **Promtail**: For log collection and routing it to Loki for aggregation.
1. **Tempo** : Distributed tracing
1. **OpenTelemetry** : Instrumentation SDK
1. **Winston** : Structured logging


## How to use it

### Prerequisites
1. Docker Engine 24.x+ and Docker Compose 2.x+
1. Node.js 20.x+ (for local development without Docker)
1. 8GB RAM minimum (recommended 16GB for full stack)
4. Environment variables: Set API keys for payments, database connections, etc., in .env files per service.


## Development Setup

1. Clone the repository: git clone <repo-url>.
2. Navigate to the root: cd marketplace-api.
3. Start services: docker-compose -f docker-compose.dev.yml up -d.
4. Access API Gateway at http://localhost:8000.
5. Seed databases: Run migration scripts in each service (e.g., via entrypoints in Dockerfiles).
6. Test endpoints: Use Postman or curl to hit routes like /auth/login, /products, /orders.


## Testing Strategy
### **Test Pyramid**
1. E2E Tests make up 10 perecent of the Test in the app
2. Integration Tests makes up 20 percent
3. Unit Tests takes the remaining 70 percentage

### **Test Coverage Goals**
- Unit: >80%
- Integration: >60%
- E2E: Critical paths only
