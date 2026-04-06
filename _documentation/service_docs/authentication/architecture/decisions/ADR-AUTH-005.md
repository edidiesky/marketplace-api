# ADR-AUTH-005: Multi-step registration (email > magic link > password)
 
## Context
 
I needed to verify that a user owns the email address they are registering with before letting them set a password. A simple email + password form does not verify email ownership at registration time.
 
## Decision
 
I split registration into three steps. Step one: the user submits their email. I check if it already exists, then send a magic link with a token stored in Redis for 15 minutes. Step two: the user clicks the link. I verify and delete the token from Redis. Step three: the user sets their password. I create the user record in MongoDB only after all three steps succeed.
 
## Consequences
 
What I gained: email ownership is verified before the account exists. I never create a user record with an unverified email.
 
What I gave up: a three-step flow is more friction than a simple form. Users who do not click the magic link within 15 minutes have to start again.
 
What I now live with: the magic link token in Redis is the only proof of intent. If it expires, the flow is dead and the user must restart. I accept this. The 15-minute window is generous enough for normal use.