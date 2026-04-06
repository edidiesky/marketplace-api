# ADR-AUTH-002: OTP-based 2FA on every login

### Context
 
I wanted a second factor on login to protect seller and admin accounts. I considered TOTP (Google Authenticator style) and SMS/email OTP. The platform serves a Nigerian market where email and SMS are the dominant communication channels and users are unlikely to have authenticator apps set up.
 
### Decision
 
I generate a 6-digit OTP on every login, store it in Redis with a 15-minute TTL, and send it via SMS or email. The user must submit it on `POST /login/verify-2fa` before I issue tokens. I delete the OTP from Redis immediately after it is used.
 
### Consequences


What I gained: a second factor that works without any app installation. The OTP is useless after 15 minutes or after one use.
 
What I gave up: OTP via SMS/email is weaker than TOTP because it is susceptible to SIM swap attacks and email compromise. I accept this for the current user base.
 
What I now live with: I depend on the SMS/email delivery service being available for every login. If the notification service is down, users cannot log in. I should add a fallback or at least a clear error message.