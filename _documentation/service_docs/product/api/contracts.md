# API CONTRACTS: PRODUCT SERVICE

**Base URL:** `/api/v1/products`
**Auth:** Bearer JWT required unless noted. Internal endpoints require `x-internal-secret` header.
**Last updated:** 2026-03-19
**Owner:** Eddy

All responses are in JSON format; the dates are in ISO 8601 UTC. All IDs are MongoDB ObjectId strings.


---
## POST /