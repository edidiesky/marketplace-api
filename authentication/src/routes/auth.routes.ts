import { Router, Request, Response, NextFunction } from "express";
import { validateRequest } from "../middleware/validate.middleware";
import {
  signupSchema,
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
const router = Router();



// Email step
router.post(
  "/verify-email",
  validateRequest(emailOnboardingSchema),
  HandleEmailOnboardingStep
);

// Verify email token
router.get(
  "/email/confirmation",
  HandleConfirmEmailToken
);

// Password step
router.post(
  "/verify-password",
  validateRequest(passwordOnboardingSchema),
  HandlePasswordOnboardingStep
);

// Final signup
router.post(
  "/signup",
  validateRequest(finalSignupOnboardingSchema),
  RegisterUser
);

router.post(
  "/login",
  validateRequest(loginSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void LoginUser(req, res, next);
  }
);
router.post(
  "/verify-otp",
  validateRequest(twoFASchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void Verify2FA(req, res, next);
  }
);

/** REQUEST PASSWORD RESET  */
router.post(
  "/request-reset",
  validateRequest(requestPasswordResetSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void RequestPasswordResetHandler(req, res, next);
  }
);

/** REQUEST REFRESH TOKEN */
router.post(
  "/refresh-token",
  // authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    void RefreshToken(req, res, next);
  }
);

/** REQUEST PASSWORD RESET  */
router.post(
  "/password-reset",
  validateRequest(passwordResetSchema),
  // authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    void ResetPasswordHandler(req, res, next);
  }
);

// UploadExpartiateTaxpayerCSVHandler
router.post(
  "/password-change",
  (req: Request, res: Response, next: NextFunction): void => {
    void ChangePasswordHandler(req, res, next);
  }
);

router.post(
  "/logout",
  (req: Request, res: Response, next: NextFunction): void => {
    void LogoutUserHandler(req, res, next);
  }
);

export default router;
/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: Creates a new user account and sends an OTP verification email.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered, OTP sent to email
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
 *                   example: Registration successful. Check your email for OTP.
 *       400:
 *         description: Validation error or email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     description: Returns access and refresh tokens on successful authentication.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Email not verified
 */

/**
 * @openapi
 * /api/v1/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout current user
 *     description: Invalidates the refresh token stored in Redis.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */

/**
 * @openapi
 * /api/v1/auth/verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify email with OTP
 *     description: Verifies the OTP sent to the user email during registration.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OtpRequest'
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/v1/auth/resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend OTP verification email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendOtpRequest'
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Email already verified or not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @openapi
 * /api/v1/auth/refresh-token:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: Uses the refresh token from cookie or body to issue a new access token.
 *     security: []
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *       401:
 *         description: Invalid or expired refresh token
 */

/**
 * @openapi
 * /api/v1/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Reset email sent if account exists
 *       400:
 *         description: Invalid email
 */

/**
 * @openapi
 * /api/v1/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired reset token
 */

/**
 * @openapi
 * /api/v1/auth/me:
 *   get:
 *     tags: [Profile]
 *     summary: Get current authenticated user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized
 */