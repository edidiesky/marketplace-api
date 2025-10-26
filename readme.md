# Read This First, bro!

SellEasi API is a multi-tenant e-commerce platform designed specifically for students to sell products of their choice. It enables users to create and manage their own tenant stores, handle inventory, process payments, and facilitate sales in a scalable, secure manner. The platform is built using a microservices architecture to ensure modularity, fault tolerance, and ease of scaling each services independently.

![Project Screenshot](/architecture/Onboarding%20workflow.png)
![Project Screenshot](/architecture/Payment%20Workflow.png)
![Audit Workflow](/architecture/Payment_Audit_Workflow.png)

# Repo Map
```bash
SELLEASI-ARCHITECTURE/
├── api_gateway # Central entry point for all requests in Selleasi, handles routing, rate limiting, and security.
├── audit # Basic Service that logs activities for compliance and debugging.
├── authentication # Manages user login, JWT tokens, and role-based access.
├── product # Simple CRUD operations for products, including attributes like categories, colors, sizes.
├── cart # Manages user shopping carts.
├── categories # Manages user login, JWT tokens, and role-based access.
├── color # Manages user login, JWT tokens, and role-based access.
├── inventory # Manages user login, JWT tokens, and role-based access.
├── orders # Processes orders asynchronously via Kafka, integrates with payments and inventory.
├── payment # Service that aid interacting with payment gateways (e.g., Paystack, Paypal) for transactions.
├── size # Manages user login, JWT tokens, and role-based access.
├── stores # Manages store profiles and configurations per tenant.
├── tenant # Handles multi-tenancy, allowing students to create and manage isolated stores.
├── prometheus # Monitoring and metrics collection.
├── etc # Promtail and Loki configuration for metrics scraping and querying of Logs via Loki using Grafana
├── architecture # Various High level diagram depicting my thinking and also some deep dives
├── redis # Configurations for each of the Redis cluster participating Nodes (Master and both slave config)
├── .gitignore
```



### This MVP focuses on core features including:

1. Multi-tenancy for isolated store environments.
2. User authentication and authorization.
3. Product catalog management (categories, colors, sizes, reviews).
4. Shopping cart and order processing.
5. Inventory management with real-time updates.
6. Payment integration.
7. API gateway for routing and rate limiting.
8. Event-driven architecture using Kafka for asynchronous communication (e.g., order workflows).
9. Caching with Redis for performance optimization.
10. Notifications for order updates.
11. Monitoring with Prometheus.




## Table of Contents

- [MVP](#mvp)
- [Architecture](#architecure)
- [Technologies Used](#technologies-used)
- [Features](#features)
- [Mini Workflow](#mini workflow)
- [Getting Started](#getting-started)
- [Contact](#contact)


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
2. Node.js/Python/Go (depending on service implementations—assume Go for services).
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