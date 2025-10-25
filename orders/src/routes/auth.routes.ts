import { Router, Request, Response, NextFunction } from "express";
import { validateRequest } from "../middleware/validate.middleware";
import {
  signupSchema,
  loginSchema,
  twoFASchema,
  passwordResetSchema,
  requestPasswordResetSchema,
  uploadSchema,
  adminSignupSchema,
  UploadBulkCompanyCSVHandlerSchema,
} from "../validators/auth.validator";
import {
  LoginUser,
  LogoutUserHandler,
  RegisterUser,
  RequestPasswordResetHandler,
  ResetPasswordHandler,
  UploadTaxpayerCSVHandler,
  Verify2FA,
  RefreshToken,
  ChangePasswordHandler,
  RegisterAdminUser,
  RegisterAgency,
  RegisterGroup,
  BulkTaxpayerProgressHandler,
  getUserEmployeeUploadStatus,
  getSingleUserEmployeeUploadStatus,
  UploadExpartiateTaxpayerCSVHandler,
  UploadCompanyBranchCSVHandler,
  RestrictAccountHandler,
  UnrestrictAccountHandler,
  UploadBulkCompanyCSVHandler,
  BulkCompanyProgressHandler,
} from "../controllers/auth.controller";
import {
  authenticate,
  requirePermissions,
} from "../middleware/auth.middleware";
import { Permission, RoleLevel } from "../models/User";
import { agencySignupSchema } from "../validators/agency.validator";
import { groupSignupSchema } from "../validators/group.validators";
const router = Router();

// bulk-taxpayer-progress

router.get(
  "/upload-status",
  authenticate,
  (req: Request, res: Response): void => {
    void getUserEmployeeUploadStatus(req, res);
  }
);
router.get(
  "/upload-status/:id",
  authenticate,
  (req: Request, res: Response): void => {
    void getSingleUserEmployeeUploadStatus(req, res);
  }
);
router.get(
  "/bulk-taxpayer-progress/:id",
  authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    void BulkTaxpayerProgressHandler(req, res, next);
  }
);

router.get(
  "/bulk-company-progress/:publicId",
  authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    void BulkCompanyProgressHandler(req, res, next);
  }
);

router.post(
  "/group-signup",
  authenticate,
  requirePermissions([Permission.CREATE_USER]),
  validateRequest(groupSignupSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void RegisterGroup(req, res, next);
  }
);

router.post(
  "/signup",
  validateRequest(signupSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void RegisterUser(req, res, next);
  }
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

router.post(
  "/bulk-taxpayer-upload",
  validateRequest(uploadSchema),
  authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    void UploadTaxpayerCSVHandler(req, res, next);
  }
);
router.post(
  "/bulk-taxpayer-upload/expartiate",
  validateRequest(uploadSchema),
  authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    void UploadExpartiateTaxpayerCSVHandler(req, res, next);
  }
);

// UploadCompanyBranchCSVHandler
router.post(
  "/bulk-taxpayer-upload/company-branch",
  validateRequest(uploadSchema),
  authenticate,
  (req: Request, res: Response, next: NextFunction): void => {
    void UploadCompanyBranchCSVHandler(req, res, next);
  }
);

router.post(
  "/bulk-taxpayer-upload/company",
  validateRequest(UploadBulkCompanyCSVHandlerSchema),
  authenticate,
  requirePermissions([Permission.CREATE_USER]),
  (req: Request, res: Response, next: NextFunction): void => {
    void UploadBulkCompanyCSVHandler(req, res, next);
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

// Admin user registration
router.post(
  "/admin-signup",
  authenticate,
  // requireMinimumRoleLevel(RoleLevel.DIRECTORATE_HEAD),
  // requirePermissions([Permission.CREATE_USER]),
  validateRequest(adminSignupSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void RegisterAdminUser(req, res, next);
  }
);

// Adgency user registration
router.post(
  "/agency-signup",
  authenticate,
  // requireMinimumRoleLevel(RoleLevel.DIRECTORATE_HEAD),
  // requirePermissions([Permission.CREATE_USER]),
  validateRequest(agencySignupSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void RegisterAgency(req, res, next);
  }
);

//  RestrictAccountHandler,
// UnrestrictAccountHandler,

router.put(
  "/restrict-account",
  authenticate,
  // requireMinimumRoleLevel(RoleLevel.DIRECTORATE_HEAD),
  // requirePermissions([Permission.CREATE_USER]),
  // validateRequest(agencySignupSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void RestrictAccountHandler(req, res, next);
  }
);

router.put(
  "/unrestrict-account",
  authenticate,
  // requireMinimumRoleLevel(RoleLevel.DIRECTORATE_HEAD),
  // requirePermissions([Permission.CREATE_USER]),
  // validateRequest(agencySignupSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void UnrestrictAccountHandler(req, res, next);
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
