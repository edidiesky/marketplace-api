import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
  BAD_REQUEST_STATUS_CODE,
} from "../constants";

export const HandleEmailOnboardingStep = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, firstName, lastName, notificationId } = req.body;
    await authService.initiateEmailOnboarding({ email, firstName, lastName, notificationId });
    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      data: null,
      success: true,
      message: `Verification email sent to ${email}. Please check your inbox.`,
    });
  }
);

export const HandleConfirmEmailToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { token, email } = req.query as { email: string; token: string };
    await authService.confirmEmailToken({ email, token });
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      data: null,
      success: true,
      message: "Email verified. Proceed to password setup.",
      nextStep: "password",
    });
  }
);

export const HandlePasswordOnboardingStep = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { password, email } = req.body;
    await authService.setOnboardingPassword({ email, password });
    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      data: { email },
      success: true,
      message: "Password set. Proceed to the final registration step.",
    });
  }
);

export const RegisterUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, userType, phone, address, gender, plan, tenantType } = req.body;
    const user = await authService.registerUser({
      email, userType, phone, address, gender, plan, tenantType,
    });
    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success: true,
      data:    user._id,
      message: "Account created. Check your email for next steps.",
    });
  }
);

export const LoginUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, password, idempotencyKey } = req.body;
    const result = await authService.initiateLogin({
      email,
      password,
      idempotencyKey,
      ip:        req.headers["x-forwarded-for"] as string,
      userAgent: req.headers["user-agent"],
    });
    res.status(200).json({
      message: "A 2FA token has been sent to your registered phone. Please verify to complete login.",
      email:   result.email,
    });
  }
);

export const Verify2FA = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, otp } = req.body;
    const { accessToken, refreshToken, user } = await authService.verify2FA({
      email, otp, res,
    });
    res.status(200).json({ accessToken, refreshToken, user });
  }
);

export const RefreshToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshToken({
      refreshToken,
      ip:        req.headers["x-forwarded-for"] as string,
      userAgent: req.headers["user-agent"],
    });
    res.cookie("jwt", tokens.accessToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      expires:  new Date(Date.now() + 15 * 60 * 1000),
      path:     "/",
    });
    res.status(200).json(tokens);
  }
);

export const RequestPasswordResetHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    await authService.requestPasswordReset(email);
    res.status(200).json({
      message: "A password reset link has been sent to your email.",
    });
  }
);

export const ResetPasswordHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { token, newPassword } = req.body;
    await authService.resetPassword({ token, newPassword });
    res.status(200).json({
      message: "Password reset successfully. You can now log in.",
    });
  }
);

export const ChangePasswordHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, newPassword } = req.body;
    await authService.changePassword({ email, newPassword });
    res.status(200).json({ message: "Password changed successfully." });
  }
);

export const LogoutUserHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const token = req.cookies?.jwt || req.headers.authorization?.split(" ")[1];
    const { refreshToken } = req.body;
    await authService.logout({
      token,
      refreshToken,
      jwtSecret: process.env.JWT_CODE!,
    });
    res.cookie("jwt", "", {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
    });
    res.status(200).json({ message: "Logged out successfully." });
  }
);