import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { ClientSession } from "mongoose";
import {
  userRepository,
  passwordResetRepository,
} from "../repository/user.repository";
import redisClient from "../config/redis";
import logger from "../utils/logger";
import { generateSecureToken } from "../utils/resetTokenGenerator";
import { generateToken, signJwt } from "../utils/generateToken";
import { sendAuthenticationMessage } from "../messaging/producer";
import {
  deleteOnboardingState,
  getOnboardingState,
  getRedisOnboardingKey,
  setOnboardingData,
} from "../utils/redisOnboarding";
import { normalizePhoneNumber } from "../utils/normalizePhoneNumber";
import {
  BASE_EXPIRATION_SEC,
  NOTIFICATION_ONBOARDING_EMAIL_CONFIRMATION_TOPIC,
  NOTIFICATION_AUTHENTICATION_2FA_TOPIC,
  USER_ONBOARDING_COMPLETED_TOPIC,
  ONBOARDING_EXPIRATION_SEC,
  REDIS_EXPIRATION_MIN,
} from "../constants";
import { Gender, UserType } from "../models/User";
import { Response } from "express";

//  ONBOARDING
export const authService = {
  async initiateEmailOnboarding(params: {
    email: string;
    firstName: string;
    lastName: string;
    notificationId?: string;
  }): Promise<void> {
    const { email, firstName, lastName, notificationId } = params;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing) {
      logger.warn("Email onboarding rejected: email already registered", {
        event: "email_onboarding_duplicate",
        email: normalizedEmail,
      });
      throw new Error("Email already registered");
    }

    const token = uuidv4();
    const link = `${process.env.WEB_ORIGIN}/onboarding/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;
    const expiresAt = Date.now() + ONBOARDING_EXPIRATION_SEC;

    await setOnboardingData({
      email: normalizedEmail,
      step: "email",
      firstName,
      lastName,
      tokenObject: { token, expiresAt },
    });

    await sendAuthenticationMessage(
      NOTIFICATION_ONBOARDING_EMAIL_CONFIRMATION_TOPIC,
      { email, firstName, lastName, notificationId, verification_url: link },
    );

    logger.info("Email onboarding initiated", {
      event: "email_onboarding_initiated",
      email: normalizedEmail,
    });
  },

  async confirmEmailToken(params: {
    email: string;
    token: string;
  }): Promise<void> {
    const { email, token } = params;
    const key = getRedisOnboardingKey(email);
    const state = await redisClient.get(key);

    if (!state) {
      logger.warn("Email token confirmation failed: no onboarding session", {
        event: "email_token_confirm_no_session",
        email,
      });
      throw new Error(
        "No onboarding session found. Please restart the process.",
      );
    }

    const onboardingData = JSON.parse(state);

    if (onboardingData.tokenObject?.token !== token) {
      logger.warn("Email token confirmation failed: token mismatch", {
        event: "email_token_confirm_invalid",
        email,
      });
      throw new Error("The token provided is not valid for onboarding");
    }

    if (Date.now() > (onboardingData.tokenObject?.expiresAt ?? 0)) {
      logger.warn("Email token confirmation failed: token expired", {
        event: "email_token_confirm_expired",
        email,
        expiresAt: onboardingData.tokenObject.expiresAt,
      });
      throw new Error(
        "The token has expired. Please retry the onboarding flow.",
      );
    }

    logger.info("Email token confirmed successfully", {
      event: "email_token_confirmed",
      email,
    });
  },

  async setOnboardingPassword(params: {
    email: string;
    password: string;
  }): Promise<void> {
    const { email, password } = params;
    const key = getRedisOnboardingKey(email);
    const state = await redisClient.get(key);

    if (!state) {
      logger.warn("Password step failed: no onboarding session", {
        event: "password_step_no_session",
        email,
      });
      throw new Error(
        "No onboarding session found. Please restart the process.",
      );
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    await setOnboardingData({ email, passwordHash, step: "password" });

    logger.info("Password step completed", {
      event: "password_step_completed",
      email,
    });
  },

  //  REGISTRATION

  async registerUser(params: {
    email: string;
    userType: UserType;
    phone: string;
    address?: string;
    gender?: Gender;
    plan?: string;
    tenantType?: string;
  }) {
    const { email, userType, phone, address, gender, plan, tenantType } =
      params;
    const normalizedEmail = email.toLowerCase().trim();

    const onboardingData = await getOnboardingState(normalizedEmail);
    if (!onboardingData || onboardingData.step !== "password") {
      logger.warn("Registration failed: onboarding steps incomplete", {
        event: "registration_incomplete_onboarding",
        email: normalizedEmail,
        currentStep: onboardingData?.step,
      });
      throw new Error("Please complete all onboarding steps first");
    }

    const { passwordHash, firstName, lastName } = onboardingData;
    const session: ClientSession = await mongoose.startSession();
    let user: any;

    await session.withTransaction(async () => {
      const existing = await userRepository.findByEmail(
        onboardingData.email,
        undefined,
        session,
      );

      if (existing) {
        logger.warn("Registration failed: user already exists", {
          event: "registration_duplicate_user",
          email: normalizedEmail,
        });
        throw new Error(
          "An account with this email already exists. Please login instead.",
        );
      }

      const [created] = await userRepository.create(
        [
          {
            email: onboardingData.email,
            passwordHash,
            firstName,
            lastName,
            userType,
            isEmailVerified: true,
            phone,
            address,
            gender,
          },
        ],
        session,
      );
      user = created;
    });

    session.endSession();

    if (user && user.userType !== UserType.CUSTOMER) {
      await sendAuthenticationMessage(USER_ONBOARDING_COMPLETED_TOPIC, {
        ownerId: user._id,
        ownerEmail: user.email,
        ownerName: user.firstName,
        type: tenantType,
        billingPlan: plan,
      });

      logger.info("Tenant onboarding event emitted", {
        event: "tenant_onboarding_emitted",
        userId: user._id.toString(),
        userType,
      });
    }

    await deleteOnboardingState(normalizedEmail);

    logger.info("User registered successfully", {
      event: "user_registered",
      userId: user._id.toString(),
      userType,
    });

    return user;
  },

  //  LOGIN

  async initiateLogin(params: {
    email: string;
    password: string;
    idempotencyKey?: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{ email: string }> {
    const { email, password, idempotencyKey, ip, userAgent } = params;
    const notificationId = idempotencyKey ?? uuidv4();
    const cacheKey = `user:${email}`;

    let user: any = null;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      user = JSON.parse(cached);
      logger.info("User fetched from cache for login", {
        event: "login_cache_hit",
        email,
      });
    } else {
      user = await userRepository.findByEmail(
        email,
        "+passwordHash +phone +email +userType +firstName +lastName",
      );

      if (user) {
        await redisClient.setex(
          cacheKey,
          BASE_EXPIRATION_SEC,
          JSON.stringify(user),
        );
      }
    }

    if (!user) {
      logger.warn("Login failed: user not found", {
        event: "login_user_not_found",
        email,
        ip,
        userAgent,
      });
      throw Object.assign(
        new Error("No account found with this email. Please sign up."),
        { statusCode: 401 },
      );
    }

    if (user.falseIdentificationFlag) {
      logger.warn("Login blocked: false identification flag set", {
        event: "login_blocked_false_flag",
        userId: user._id?.toString(),
        email,
        ip,
      });
      throw Object.assign(
        new Error("Your account has been restricted. Please contact support."),
        { statusCode: 400 },
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      logger.warn("Login failed: invalid password", {
        event: "login_invalid_password",
        userId: user._id?.toString(),
        email,
      });
      throw Object.assign(new Error("Invalid password credentials."), {
        statusCode: 400,
      });
    }

    const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    const twoFAToken = await generateSecureToken(user._id.toString(), "2fa");
    const { phone } = user;
    const normalizedPhone = phone?.startsWith("0")
      ? normalizePhoneNumber(phone)
      : phone;

    await redisClient.setex(
      `2fa:${user.email}`,
      REDIS_EXPIRATION_MIN,
      JSON.stringify({
        token: twoFAToken,
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
      }),
    );

    await sendAuthenticationMessage(NOTIFICATION_AUTHENTICATION_2FA_TOPIC, {
      token: twoFAToken,
      phone: normalizedPhone,
      notificationId,
      email: user.email,
      fullName,
      message: `Hi ${fullName}, your 2FA code for Selleasi is ${twoFAToken}. Expires in 5 minutes.`,
    });

    logger.info("2FA token issued", {
      event: "2fa_token_issued",
      userId: user._id?.toString(),
      email,
    });

    return { email: user.email };
  },

  //  2FA VERIFY

  async verify2FA(params: {
    email: string;
    otp: string;
    res: Response;
  }): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const { email, otp, res } = params;

    const user = await userRepository.findByEmail(email, "-passwordHash");
    if (!user) {
      logger.warn("2FA verification failed: user not found", {
        event: "2fa_verify_user_not_found",
        email,
      });
      throw new Error("User not found");
    }

    const cachedTokenStr = await redisClient.get(`2fa:${email}`);
    if (!cachedTokenStr) {
      logger.warn("2FA verification failed: no token in cache", {
        event: "2fa_verify_no_cached_token",
        userId: (user as any)._id?.toString(),
        email,
      });
      throw new Error("Invalid or expired 2FA token");
    }

    const cachedToken = JSON.parse(cachedTokenStr);
    if (
      cachedToken.token !== otp ||
      Date.now() > Number(new Date(cachedToken.expiresAt).getTime())
    ) {
      logger.warn("2FA verification failed: token mismatch or expired", {
        event: "2fa_verify_invalid_token",
        userId: (user as any)._id?.toString(),
        email,
      });
      throw new Error("Invalid or expired 2FA token");
    }

    if ((user as any).tenantId && (user as any).tenantStatus !== "ACTIVE") {
      logger.warn("2FA verify blocked: tenant not yet active", {
        event: "2fa_verify_tenant_not_active",
        userId: (user as any)._id?.toString(),
        tenantId: (user as any).tenantId,
        tenantStatus: (user as any).tenantStatus,
      });
      throw Object.assign(
        new Error(
          "Your account setup is still processing. Please try again in a moment.",
        ),
        { statusCode: 403 },
      );
    }

    const fullName =
      `${(user as any).firstName ?? ""} ${(user as any).lastName ?? ""}`.trim();
    const { accessToken, refreshToken } = await generateToken(
      res,
      (user as any)._id.toString(),
      (user as any).userType,
      fullName,
      (user as any).tenantId ?? "",
      (user as any).tenantType ?? "",
      (user as any).tenantPlan ?? "FREE",
    );

    await redisClient.del(`2fa:${email}`);

    logger.info("2FA verification successful, tokens issued", {
      event: "2fa_verify_success",
      userId: (user as any)._id?.toString(),
      email,
    });

    return { accessToken, refreshToken, user };
  },

  //  REFRESH TOKEN

  async refreshToken(params: {
    refreshToken: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken, ip, userAgent } = params;

    const cached = await redisClient.get(`refresh:${refreshToken}`);
    if (!cached) {
      logger.warn("Refresh token failed: token not found in Redis", {
        event: "refresh_token_not_found",
      });
      throw Object.assign(new Error("Invalid or expired refresh token"), {
        statusCode: 401,
      });
    }

    const { userId, userType, name } = JSON.parse(cached);

    const user = await userRepository.findById(userId, "-passwordHash");
    if (!user) {
      logger.warn("Refresh token failed: user not found", {
        event: "refresh_token_user_not_found",
        userId,
      });
      throw new Error("User not found");
    }

    const newAccessToken = await signJwt(
      (user as any)._id.toString(),
      userType,
      name,
      (user as any).tenantId ?? "",
      (user as any).tenantType ?? "",
      (user as any).tenantPlan ?? "FREE",
    );

    const newRefreshToken = await generateSecureToken(
      (user as any)._id.toString(),
      "refresh",
    );

    await redisClient.set(
      `refresh:${newRefreshToken}`,
      JSON.stringify({ userId: (user as any)._id, userType, name }),
      "EX",
      BASE_EXPIRATION_SEC,
    );

    await redisClient.del(`refresh:${refreshToken}`);

    logger.info("Refresh token rotated successfully", {
      event: "refresh_token_rotated",
      userId: (user as any)._id?.toString(),
      ip,
      userAgent,
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  },

  //  PASSWORD RESET

  async requestPasswordReset(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      logger.warn("Password reset request: user not found", {
        event: "password_reset_request_user_not_found",
        email,
      });
      throw Object.assign(new Error("No account found for this email."), {
        statusCode: 401,
      });
    }

    const token = await generateSecureToken((user as any)._id.toString());

    logger.info("Password reset token generated", {
      event: "password_reset_token_generated",
      userId: (user as any)._id?.toString(),
      email,
    });

    // sendAuthenticationMessage("auth.password.reset.token", { email, token, name: fullName });
  },

  async resetPassword(params: {
    token: string;
    newPassword: string;
  }): Promise<void> {
    const { token, newPassword } = params;

    const resetToken = await passwordResetRepository.findByToken(token);
    if (!resetToken) {
      logger.warn("Password reset failed: token not found", {
        event: "password_reset_token_not_found",
      });
      throw new Error(
        "The password reset token is not valid. Please request a new one.",
      );
    }

    if (resetToken.expiresAt < new Date()) {
      await passwordResetRepository.deleteById(resetToken._id.toString());
      logger.warn("Password reset failed: token expired", {
        event: "password_reset_token_expired",
        userId: resetToken.userId?.toString(),
        expiresAt: resetToken.expiresAt,
      });
      throw new Error(
        "The password reset token has expired. Please request a new link.",
      );
    }

    const user = await userRepository.findById(resetToken.userId.toString());
    if (!user) {
      logger.warn("Password reset failed: user not found for token", {
        event: "password_reset_user_not_found",
        userId: resetToken.userId?.toString(),
      });
      throw Object.assign(new Error("No account found for this token."), {
        statusCode: 401,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await userRepository.updateById((user as any)._id.toString(), {
      passwordHash,
    } as any);
    await passwordResetRepository.deleteById(resetToken._id.toString());
    await redisClient.setex(
      `user:${(user as any).email}`,
      BASE_EXPIRATION_SEC,
      JSON.stringify({ ...(user as any), passwordHash }),
    );

    logger.info("Password reset successfully", {
      event: "password_reset_success",
      userId: (user as any)._id?.toString(),
      email: (user as any).email,
    });
  },

  async changePassword(params: {
    email: string;
    newPassword: string;
  }): Promise<void> {
    const { email, newPassword } = params;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await userRepository.updateByEmail(email, { passwordHash } as any);

    logger.info("Password changed successfully", {
      event: "password_changed",
      email,
    });
  },

  //  LOGOUT

  async logout(params: {
    token?: string;
    refreshToken?: string;
    jwtSecret: string;
  }): Promise<void> {
    const { token, refreshToken, jwtSecret } = params;

    if (token) {
      try {
        const decoded = require("jsonwebtoken").verify(token, jwtSecret) as any;
        const remainingTTL = decoded.exp - Math.floor(Date.now() / 1000);
        if (remainingTTL > 0) {
          await redisClient.set(
            `blocklist:${decoded.user.userId}`,
            "1",
            "EX",
            remainingTTL,
          );
          logger.info("Access token blocklisted on logout", {
            event: "logout_token_blocklisted",
            userId: decoded.user.userId,
            remainingTTL,
          });
        }
      } catch {
        // token already expired, no blocklist needed
      }
    }

    if (refreshToken) {
      await redisClient.del(`refresh:${refreshToken}`);
      logger.info("Refresh token deleted on logout", {
        event: "logout_refresh_token_deleted",
      });
    }
  },
};

