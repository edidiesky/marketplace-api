# ADR-AUTH-001: Hybrid JWT pattern (stateless access + stateful refresh)

### Context
 
I needed a token strategy that balances security with performance. A fully stateless JWT means I cannot invalidate a token until it expires, which is a security risk if a token is stolen. A fully stateful token means I hit the database or Redis on every single request, which kills performance under load.

### Decision
 
I made use of two tokens together. The access token is a short-lived stateless JWT (15 minutes). I never check it against Redis on the hot path. The refresh token is a stateful `nanoid(32)` string stored in Redis with a 7-day TTL. I only hit Redis when the access token expires and the client needs a new one.
 

### Consequences
 
What I gained: hot path requests only verify the JWT signature and check one Redis key for the blocklist. That is fast. Stolen access tokens expire in at most 15 minutes without any action from me.
 
What I gave up: a stolen access token is valid for up to 15 minutes even after logout. I accept this window. The blocklist partially closes it: on logout I write a blocklist key to Redis so even a valid JWT is rejected if the user has logged out.
 
What I now live with: two tokens to manage on the client side, and I must make sure the refresh rotation logic is correct or I will lock users out.