# ADR-AUTH-003: Refresh token rotation on every use
 
### Context
 
If a refresh token is stolen and used by an attacker, I need to detect it and invalidate the session. Refresh tokens that never rotate are permanent credentials once stolen.
 
### Decision
 
Every time a client calls `POST /token/refresh`, I delete the old refresh token and write a new one in a single Redis pipeline before responding. If the old token no longer exists when the client tries to use it, I return 401 and the client must log in again.
 
### Consequences
 
What I gained: if an attacker steals a refresh token and uses it, the legitimate client's next refresh attempt will fail because the token was rotated. This signals a possible theft and forces re-authentication.
 
What I gave up: if a client has a race condition and sends two refresh requests at the same time, one will fail. I accept this. It is an edge case and the fix is for the client to retry with a fresh login.
 
What I now live with: I must handle the Redis pipeline atomically. A partial write where I delete the old token but fail to write the new one would lock the user out permanently. The pipeline makes this atomic.

