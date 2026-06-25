import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { authService } from "./auth.service";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../../constants";
import { AppError } from "../../utils/AppError";
import { RegisterUserDto } from "./auth.dto";

//  StepAccount
export const HandleInitiateOnboarding = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, password, confirmPassword, notificationId } = req.body as {
      email:           string;
      password:        string;
      confirmPassword: string;
      notificationId?: string;
    };

    await authService.initiateOnboarding({
      email,
      password,
      confirmPassword,
      notificationId,
    });

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success: true,
      data:    null,
      message: `Verification email sent to ${email}. Please check your inbox.`,
    });
  }
);

// Email redirect target
export const HandleConfirmEmailToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { token, email } = req.query as { email: string; token: string };

    if (!token || !email) {
      throw AppError.badRequest(
        "token and email are required query parameters."
      );
    }

    await authService.confirmEmailToken({ email, token });

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success:  true,
      data:     null,
      message:  "Email verified. Proceed to complete your profile.",
      nextStep: "details",
    });
  }
);

//  StepDetails
export const RegisterHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as RegisterUserDto;
    const result = await authService.registerUser({ ...dto, res });

    res.status(201).json({
      success: true,
      data: {
        userId:           result.userId,
        email:            result.email,
        userType:         result.userType,
        organizationType: result.organizationType,
      },
      accessToken:  result.accessToken,
      refreshToken: result.refreshToken,
      message:      "Account created successfully.",
    });
  }
);
export const LoginUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, password, idempotencyKey } = req.body as {
      email:           string;
      password:        string;
      idempotencyKey?: string;
    };
    const result = await authService.initiateLogin({
      email,
      password,
      idempotencyKey,
      ip:        req.headers["x-forwarded-for"] as string | undefined,
      userAgent: req.headers["user-agent"],
    });
    res.status(200).json({
      success: true,
      message: "A 2FA token has been sent to your registered contact.",
      email:   result.email,
    });
  }
);

export const Verify2FA = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, otp } = req.body as { email: string; otp: string };
    const result = await authService.verify2FA({ email, otp, res });
    res.status(200).json({
      success:      true,
      accessToken:  result.accessToken,
      refreshToken: result.refreshToken,
      user:         result.user,
    });
  }
);

export const RefreshToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body as { refreshToken: string };
    const tokens = await authService.refreshToken({
      refreshToken,
      ip:        req.headers["x-forwarded-for"] as string | undefined,
      userAgent: req.headers["user-agent"],
    });
    res.cookie("jwt", tokens.accessToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      expires:  new Date(Date.now() + 15 * 60 * 1000),
      path:     "/",
    });
    res.status(200).json({ success: true, ...tokens });
  }
);

export const RequestPasswordResetHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body as { email: string };
    await authService.requestPasswordReset(email);
    res.status(200).json({
      success: true,
      message: "If this email is registered you will receive a reset link.",
    });
  }
);

export const ResetPasswordHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { token, newPassword } = req.body as {
      token:       string;
      newPassword: string;
    };
    await authService.resetPassword({ token, newPassword });
    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  }
);

export const ChangePasswordHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, newPassword } = req.body as {
      email:       string;
      newPassword: string;
    };
    await authService.changePassword({ email, newPassword });
    res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  }
);

export const LogoutUserHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const token =
      req.cookies?.jwt ??
      req.headers.authorization?.split(" ")[1];
    const { refreshToken } = req.body as { refreshToken?: string };
    await authService.logout({
      token,
      refreshToken,
      jwtSecret: process.env.JWT_CODE!,
    });
    res.cookie("jwt", "", {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
    });
    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  }
);