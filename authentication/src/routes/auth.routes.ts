import { Router, Request, Response, NextFunction } from "express";
import { validateRequest } from "../middleware/validate.middleware";
import {
  loginSchema,
  twoFASchema,
  passwordResetSchema,
  requestPasswordResetSchema,
} from "../validators/auth.validator";
import {
  LoginUser,
  LogoutUserHandler,
  RegisterUser,
  RequestPasswordResetHandler,
  ResetPasswordHandler,
  Verify2FA,
  RefreshToken,
  ChangePasswordHandler,
} from "../controllers/auth.controller";
import {
  emailOnboardingSchema,
  confirmEmailTokenSchema,
  passwordOnboardingSchema,
  finalSignupOnboardingSchema,
} from "../validators/onboarding.validator";
import {
  HandleEmailOnboardingStep,
  HandleConfirmEmailToken,
  HandlePasswordOnboardingStep,
} from "../controllers/auth.controller";
import { bypass2FAMiddleware } from "../middleware/byPass2Fa.middleware";

const router = Router();

/**
 * @openapi
 * /api/v1/auth/verify-email:
 *   post:
 *     tags:
 *       - Auth - Onboarding
 *     summary: Step 1 – Submit email to begin registration
 *     operationId: verifyEmail
 *     description: >
 *       First step of the multi-step onboarding flow.
 *       Validates the email is not already registered and sends a magic link
 *       to the provided address. The link contains a short-lived token that
 *       must be confirmed via GET /api/v1/auth/email/confirmation before
 *       proceeding to step 2.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyEmailRequest'
 *     responses:
 *       200:
 *         description: Magic link sent to the provided email address.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Verification link sent. Check your inbox."
 *       400:
 *         description: Joi validation failed or email already registered.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post(
  "/verify-email",
  validateRequest(emailOnboardingSchema),
  HandleEmailOnboardingStep
);

/**
 * @openapi
 * /api/v1/auth/email/confirmation:
 *   get:
 *     tags:
 *       - Auth - Onboarding
 *     summary: Step 2 – Confirm email via magic link token
 *     operationId: confirmEmailToken
 *     description: >
 *       Verifies the token from the magic link sent in step 1.
 *       Token is passed as a query parameter. On success, marks the email
 *       as verified in Redis and allows the user to proceed to step 3.
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           example: "a1b2c3d4e5f6..."
 *         description: Short-lived email confirmation token from the magic link.
 *     responses:
 *       200:
 *         description: Email confirmed. Proceed to set password.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Email confirmed successfully."
 *       400:
 *         description: Token missing, invalid, or expired.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/email/confirmation", HandleConfirmEmailToken);

/**
 * @openapi
 * /api/v1/auth/verify-password:
 *   post:
 *     tags:
 *       - Auth - Onboarding
 *     summary: Step 3 – Set account password
 *     operationId: verifyPassword
 *     description: >
 *       Third step of onboarding. Accepts the email and chosen password.
 *       Email must have been confirmed in step 2 otherwise this returns 400.
 *       Password is hashed and stored against the pending registration in Redis.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordOnboardingRequest'
 *     responses:
 *       200:
 *         description: Password set. Proceed to final signup.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password set. Complete your profile to finish registration."
 *       400:
 *         description: Email not yet confirmed or validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post(
  "/verify-password",
  validateRequest(passwordOnboardingSchema),
  HandlePasswordOnboardingStep
);

/**
 * @openapi
 * /api/v1/auth/signup:
 *   post:
 *     tags:
 *       - Auth - Onboarding
 *     summary: Step 4 – Complete registration and create account
 *     operationId: signup
 *     description: >
 *       Final step of onboarding. Submits profile details to create the user document.
 *       Emits USER_ONBOARDING_COMPLETED_TOPIC to Kafka which triggers the tenant
 *       provisioning saga in the Tenant service. tenantId is not available until
 *       the saga completes and patches the user record.
 *       For sellers, Verify2FA blocks login if tenantStatus is not ACTIVE.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FinalSignupRequest'
 *     responses:
 *       201:
 *         description: Account created. Tenant provisioning saga initiated for sellers.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Account created successfully."
 *                 data:
 *                   $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Validation failed or prior onboarding steps not completed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       409:
 *         description: Email already registered.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/signup",
  validateRequest(finalSignupOnboardingSchema),
  RegisterUser
);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags:
 *       - Auth - Session
 *     summary: Login with email and password
 *     operationId: login
 *     description: >
 *       Validates credentials and triggers the 2FA step.
 *       On success, generates a 6-digit OTP stored in Redis with a 15 min TTL
 *       and sends it via email or SMS depending on the user's 2FA preference.
 *       The actual access token is NOT returned here — it is returned by
 *       POST /api/v1/auth/verify-otp after the OTP is confirmed.
 *       For sellers, login is blocked if tenantStatus is not ACTIVE.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Credentials valid. OTP sent for 2FA verification.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "OTP sent to your registered email."
 *       400:
 *         description: Joi validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: Invalid email or password.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Tenant not yet active. Seller registration saga still in-flight.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/login",
  validateRequest(loginSchema),
   bypass2FAMiddleware,    
  (req: Request, res: Response, next: NextFunction): void => {
    void LoginUser(req, res, next);
  }
);

/**
 * @openapi
 * /api/v1/auth/verify-otp:
 *   post:
 *     tags:
 *       - Auth - Session
 *     summary: Verify 2FA OTP and receive access token
 *     operationId: verify2FA
 *     description: >
 *       Validates the OTP submitted by the user against the Redis-stored value.
 *       On success returns the stateless access token (15 min JWT) and sets the
 *       stateful refresh token (7 day nanoid(32)) as an HttpOnly cookie.
 *       The JWT payload carries: userId, role, tenantId, tenantType, tenantPlan,
 *       permissions, roleLevel.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Verify2FARequest'
 *     responses:
 *       200:
 *         description: OTP verified. Access token issued.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid or expired OTP.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/verify-otp",
  validateRequest(twoFASchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void Verify2FA(req, res, next);
  }
);

/**
 * @openapi
 * /api/v1/auth/refresh-token:
 *   post:
 *     tags:
 *       - Auth - Session
 *     summary: Refresh access token using refresh token
 *     operationId: refreshToken
 *     description: >
 *       Reads the refresh token from the HttpOnly cookie or request body.
 *       Validates it against Redis, rotates it (old token is invalidated,
 *       new token is issued), and returns a new 15 min access token.
 *       Refresh tokens have a 7 day lifetime and are rotated on every use.
 *     security: []
 *     responses:
 *       200:
 *         description: New access token issued. Refresh token rotated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: New 15 min stateless JWT.
 *       401:
 *         description: Refresh token missing, invalid, or expired.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/refresh-token",
  (req: Request, res: Response, next: NextFunction): void => {
    void RefreshToken(req, res, next);
  }
);

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags:
 *       - Auth - Session
 *     summary: Logout and invalidate tokens
 *     operationId: logout
 *     description: >
 *       Deletes the refresh token from Redis and writes the userId to the
 *       Redis blocklist with a TTL equal to the remaining access token lifetime.
 *       Subsequent requests with the old access token will be rejected by the
 *       authenticate middleware on the next Redis blocklist check.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out. Tokens invalidated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully."
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/logout",
  (req: Request, res: Response, next: NextFunction): void => {
    void LogoutUserHandler(req, res, next);
  }
);

/**
 * @openapi
 * /api/v1/auth/request-reset:
 *   post:
 *     tags:
 *       - Auth - Password
 *     summary: Request a password reset email
 *     operationId: requestPasswordReset
 *     description: >
 *       Sends a password reset link to the registered email if the account exists.
 *       Always returns 200 regardless of whether the email is registered
 *       to prevent user enumeration.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RequestPasswordResetRequest'
 *     responses:
 *       200:
 *         description: Reset email sent if an account with this email exists.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "If this email is registered you will receive a reset link."
 *       400:
 *         description: Joi validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 */
router.post(
  "/request-reset",
  validateRequest(requestPasswordResetSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void RequestPasswordResetHandler(req, res, next);
  }
);

/**
 * @openapi
 * /api/v1/auth/password-reset:
 *   post:
 *     tags:
 *       - Auth - Password
 *     summary: Reset password using the token from the reset email
 *     operationId: passwordReset
 *     description: >
 *       Validates the signed reset token and updates the password hash.
 *       Token is single-use and has a short TTL. After use, the token
 *       is deleted from the passwordReset collection.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordResetRequest'
 *     responses:
 *       200:
 *         description: Password updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password reset successfully. Please login."
 *       400:
 *         description: Token invalid, expired, or already used.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/password-reset",
  validateRequest(passwordResetSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void ResetPasswordHandler(req, res, next);
  }
);

/**
 * @openapi
 * /api/v1/auth/password-change:
 *   post:
 *     tags:
 *       - Auth - Password
 *     summary: Change password while authenticated
 *     operationId: changePassword
 *     description: >
 *       Allows an authenticated user to change their password by providing
 *       their current password and the desired new password.
 *       Requires a valid access token. On success, all existing refresh tokens
 *       for this user are invalidated.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed. All sessions invalidated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password changed. Please login again."
 *       400:
 *         description: Current password incorrect or validation failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing or expired Bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/password-change",
  (req: Request, res: Response, next: NextFunction): void => {
    void ChangePasswordHandler(req, res, next);
  }
);

export default router;