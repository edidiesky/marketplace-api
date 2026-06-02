import { Router, Request, Response, NextFunction } from "express";
import { validateRequest } from "../../middleware/validate.middleware";
import {
  initiateOnboardingSchema,
  finalSignupOnboardingSchema,
  loginSchema,
  twoFASchema,
  passwordResetSchema,
  requestPasswordResetSchema,
  changePasswordSchema,
} from "./auth.validator";
import {
  HandleInitiateOnboarding,
  HandleConfirmEmailToken,
  RegisterUser,
  LoginUser,
  Verify2FA,
  RefreshToken,
  RequestPasswordResetHandler,
  ResetPasswordHandler,
  ChangePasswordHandler,
  LogoutUserHandler,
} from "./auth.controller";
import { bypass2FAMiddleware } from "../../middleware/byPass2Fa.middleware";

const router = Router();

//  ONBOARDING 
router.post(
  "/onboarding/initiate",
  validateRequest(initiateOnboardingSchema),
  HandleInitiateOnboarding
);

// Email verification interstitial
router.get("/email/confirmation", HandleConfirmEmailToken);

// 
router.post(
  "/signup",
  validateRequest(finalSignupOnboardingSchema),
  RegisterUser
);

//  SESSION 

router.post(
  "/login",
  validateRequest(loginSchema),
  bypass2FAMiddleware,
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

router.post(
  "/refresh-token",
  (req: Request, res: Response, next: NextFunction): void => {
    void RefreshToken(req, res, next);
  }
);

router.post(
  "/logout",
  (req: Request, res: Response, next: NextFunction): void => {
    void LogoutUserHandler(req, res, next);
  }
);

//  PASSWORD 

router.post(
  "/request-reset",
  validateRequest(requestPasswordResetSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void RequestPasswordResetHandler(req, res, next);
  }
);

router.post(
  "/password-reset",
  validateRequest(passwordResetSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void ResetPasswordHandler(req, res, next);
  }
);

router.post(
  "/password-change",
  validateRequest(changePasswordSchema),
  (req: Request, res: Response, next: NextFunction): void => {
    void ChangePasswordHandler(req, res, next);
  }
);

export default router;