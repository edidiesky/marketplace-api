# Error Codes: Auth Service

| Code | HTTP | Message |
|---|---|---|
| AUTH_001 | 400 | Validation failed |
| AUTH_002 | 409 | Email already registered |
| AUTH_003 | 500 | Failed to send magic link email |
| AUTH_004 | 400 | Token missing from query |
| AUTH_005 | 400 | Token invalid or expired |
| AUTH_006 | 400 | Prior onboarding step not completed |
| AUTH_007 | 400 | Password does not meet strength requirements |
| AUTH_008 | 500 | Kafka publish failed after user created |
| AUTH_009 | 401 | Invalid email or password |
| AUTH_010 | 403 | Tenant not active |
| AUTH_011 | 401 | OTP invalid or expired |
| AUTH_012 | 401 | Refresh token missing |
| AUTH_013 | 401 | Refresh token not found or mismatch |
| AUTH_014 | 401 | Missing or expired Bearer token |
| AUTH_015 | 400 | Reset token invalid, expired, or already used |
| AUTH_016 | 400 | Current password incorrect |