

Phase 2: Complete Platform

 Audit service routes
 Payment service (wallet, payout, webhook)
 Orders service completion
 Cart → Order → Payment → Inventory saga
 Escrow service
 Users service
 Categories, Color, Size, View services (currently commented out)
 Store subdomain routing end to end via Caddy

Phase 3: Observability

 Fix Grafana error count false positives in Loki dashboard
 Distributed tracing via Tempo working end to end
 Prometheus alerting rules
 Grafana dashboards per service

Phase 4: Testing

 Unit tests per service (Jest)
 Integration tests for saga flows
 Contract tests between services

Phase 5: Chaos Engineering

 Kill random services and verify recovery
 RabbitMQ partition testing
 Circuit breaker validation

Phase 6: Environments

 Staging environment
 Production environment config

Phase 7: CI/CD

 GitHub Actions pipeline
 Docker image builds per service
 Automated deploy on merge

Phase 8: Service Mesh

 Evaluate Istio or Linkerd for mTLS between services
 Replace internal secret header auth

Phase 9: Documentation
 Architecture decision records (ADRs)
 Postman collections complete

Phase 10: Blogs

 Write up the architecture and debugging journey

 
Phase 5: Cross-Cutting
[ ] Transactional outbox on orders service
[ ] Transactional outbox on payment service
[ ] DLQ handler logging and alerting across all services
[ ] .env.example for every service
[ ] Caddy configuration file
[ ] Docker Compose health check verification
[ ] RabbitMQ definitions verification against current topology
[ ] Integration test: onboarding saga end to end
[ ] Integration test: order saga end to end
[ ] k6 load test: checkout flow baseline
[ ] README with architecture diagram and live URL
Phase 6: Kubernetes and Istio (Last)
[ ] k3s installation and cluster config
[ ] Kubernetes manifests for all 17 services
[ ] Istio installation and namespace injection
[ ] PeerAuthentication STRICT mTLS
[ ] AuthorizationPolicy default deny plus per-service rules
[ ] VirtualService retry and timeout per service
[ ] DestinationRule circuit breaking per service
[ ] Istio Ingress Gateway
[ ] Kiali, Jaeger, Prometheus, Grafana deployment
[ ] Helm chart wrapping all manifests
[ ] values.yaml for staging and production