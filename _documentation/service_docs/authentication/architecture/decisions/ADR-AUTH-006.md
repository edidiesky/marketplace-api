# ADR-AUTH-006: JWT payload carries permissions array and roleLevel
 
## Context
 
I needed fine-grained access control beyond simple role checks. A seller might have permission to manage products but not to approve payouts. An admin might have permission to approve payouts but not to delete stores.
 
## Decision
 
The JWT payload includes a `permissions` string array (e.g. `["products:write", "payouts:approve"]`) and a `roleLevel` integer. My `requirePermissions` middleware checks the array on protected routes. My `requireUserType` middleware checks the role string.
 
## Consequences
 
What I gained: I can enforce per-route permissions at the gateway level without hitting the database on every request. The permissions are embedded in the token.
 
What I gave up: if I need to revoke a specific permission from a user, the change does not take effect until their access token expires and they refresh. The 15-minute access token TTL limits this window.
 
What I now live with: permissions are issued at login time and baked into the token. I must be careful to reissue tokens when permissions change. For now the 15-minute TTL is an acceptable lag.
 