# API GATEWAY DECISIONS AND TRADEOFFS
This docs basically high lights some key decsions I took relating to the PAI Gateway design and tradeoffs asccociated with each of my choices

## Table of Contents

1. [Architecture & Design Decisions](#architecture--design-decisions)
2. [Tradeoffs](#tradeoffs)


## Architecture & Design Decisions

### Why HTTP Proxy (not gRPC or message-based)?

The gateway uses `axios` with `responseType: 'stream'` to forward requests. This choice:

- **Pro:** Zero-copy streaming — response bytes flow directly from upstream to client, no intermediate buffering. Critical for file uploads and large product list payloads.
- **Pro:** Preserves upstream HTTP status codes and headers exactly.
- **Con:** Tight coupling to HTTP semantics. Any upstream that moves to gRPC requires a translation layer.
- **Alternative considered:** `http-proxy-middleware` — rejected because it made OTEL span injection more complex and offered less control over header forwarding logic.

### Why no service mesh (Istio/Envoy)?

For local development and small-to-medium scale, a code-level gateway is faster to iterate on and debug. At scale (>50 services, >10k RPS), replace this with Envoy proxies per pod + a control plane. That transition is tracked in the roadmap.

### Authentication at the gateway vs. per-service

Authentication is enforced at the gateway. Downstream services receive pre-validated requests with `Authorization` header forwarded. Services can optionally re-verify the JWT for defense-in-depth but are not required to.

**Tradeoff:** If the gateway is bypassed (direct internal service-to-service call), there is no auth. In production, internal network policies (Kubernetes NetworkPolicy or VPC security groups) must prevent direct service access.

---

## Tradeoffs

| Decision | Chosen | Alternative | Why |
|----------|--------|-------------|-----|
| Proxy implementation | `axios` + stream pipe | `http-proxy-middleware` | More control over headers, error parsing, OTEL instrumentation |
| Auth enforcement | Gateway-level only | Per-service + gateway | Simpler; per-service enforcement is optional defense-in-depth |
| Response buffering | Streaming (no buffer) | Full buffer then respond | Lower memory usage; supports large payloads and file transfers |
| Error serialization | Stream-to-buffer on error | Pass-through error stream | Errors must be parsed to normalize response shape before forwarding |
| Service discovery | Static env vars | Consul / Kubernetes DNS | Sufficient for single-region Docker Compose; swap for k8s DNS in production |
| Rate limiting | Not implemented at gateway | Token-bucket per IP | Currently delegated to individual services; gateway-level is on the roadmap |

