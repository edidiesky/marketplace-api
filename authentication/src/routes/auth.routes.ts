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
  "/email/confirmation",
  validateRequest(emailOnboardingSchema),
  HandleEmailOnboardingStep
);

// Verify email token
router.get(
  "/email/confirmation",
  validateRequest(confirmEmailTokenSchema),
  HandleConfirmEmailToken
);

// Password step
router.post(
  "/password/confirmation",
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
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         fullName:
 *           type: string
 *         username:
 *           type: string
 *         password:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 * /api/v1/auth/signup:
 *   post:
 *     tags: [Authentication]
 *     summary: Register a new user
 *     description: |
 *       Creates new user and sends credentials via email.
 *
 *       Email Template:
 *       Subject: "Your AKIRS-BACKEND Backend Test Account Credentials"
 *
 *       Format:
 *
 *       Welcome to AKIRS-BACKEND Backend Test!
 *
 *       Your account has been created successfully.
 *
 *       Username: {username}
 *
 *       Password: {password}
 *
 *       Please login and change your password for security purposes.
 *
 *       Best regards,
 *
 *       AKIRS-BACKEND Backend Test Team
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [ADMIN, CLIENT]
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 credentials:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                     password:
 *                       type: string
 *                 token:
 *                   type: string
 *
 * /api/v1/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Authenticate user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 */
