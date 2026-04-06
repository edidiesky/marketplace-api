# ADR-AUTH-004: Blocklist on logout via Redis key
 
### Context
 
Access tokens are stateless JWTs. When a user logs out I cannot invalidate the token itself because there is no state to update. The token will remain valid until its 15-minute TTL expires.
 
### Decision
 
On logout I write a Redis key `blocklist:userId` with a TTL equal to the remaining lifetime of the access token. On every protected request my `authenticate` middleware checks for this key. If it exists, I reject the request with 401 even if the JWT signature is valid.
 
### Consequences
 
What I gained: logged-out users are blocked within milliseconds instead of waiting up to 15 minutes for the access token to expire.
 
What I gave up: every protected request now does one Redis GET on the hot path. This is one extra network call per request. I accept this cost. Redis at sub-millisecond latency is not a meaningful overhead.
 
What I now live with: if Redis is down, my authenticate middleware cannot check the blocklist. I fail open: the request proceeds without the blocklist check. This is a deliberate choice. Redis being down should not lock out all users from the platform.
 