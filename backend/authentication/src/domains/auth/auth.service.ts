import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { Response } from "express";
import { userRepository } from "./auth.repository";
import { passwordResetRepository } from "../auth/password-reset.repository";
import redisClient from "../../config/redis";
import logger from "../../utils/logger";
import { generateSecureToken } from "../../utils/resetTokenGenerator";
import {
  publishUserOnboardingCompleted,
  publishNotificationEmailConfirmation,
  publishNotification2FA,
  publishNotificationResetPassword,
} from "../../messaging/publisher";
import {
  deleteOnboardingState,
  getOnboardingState,
  getRedisOnboardingKey,
  setOnboardingData,
} from "../../utils/redisOnboarding";
import {
  BASE_EXPIRATION_SEC,
  ONBOARDING_EXPIRATION_SEC,
  REDIS_EXPIRATION_MIN,
  SERVICE_NAME,
} from "../../constants";
import { UserType, OrganizationType, IUser } from "./auth.model";
import { AppError } from "../../utils/AppError";
import { requestContext } from "../../context/requestContext";
import {
  InitiateEmailOnboardingDto,
  ConfirmEmailTokenDto,
  SetOnboardingPasswordDto,
  RegisterUserDto,
  RegisterUserResponseDto,
  InitiateLoginDto,
  Verify2FADto,
  AuthTokensDto,
  RefreshTokenDto,
  ResetPasswordDto,
  LogoutDto,
} from "./auth.dto";
import { normalizePhoneNumber } from "../../utils/normalizePhoneNumber";
import { generateToken, signJwt } from "../../utils/generateToken";


function deriveOrganizationType(userType: UserType): OrganizationType {
  switch (userType) {
    case UserType.SELLER_ADMIN:
    case UserType.SELLER_MEMBER:
    case UserType.SELLER_VIEWER:
      return OrganizationType.SELLER_INDIVIDUAL;
    case UserType.CUSTOMER:
      return OrganizationType.CUSTOMER_B2C;
    case UserType.INVESTOR:
      return OrganizationType.INVESTOR_ANGEL;
    case UserType.ADVISOR:
      return OrganizationType.ADVISOR;
    case UserType.PLATFORM_ADMIN:
    case UserType.PLATFORM_STAFF:
      return OrganizationType.ADMIN_PLATFORM;
    case UserType.SYSTEM:
      return OrganizationType.SYSTEM_INTERNAL;
    default:
      return OrganizationType.CUSTOMER_B2C;
  }
}

export const authService = {

  //  ONBOARDING 

  async initiateEmailOnboarding(
    params: InitiateEmailOnboardingDto
  ): Promise<void> {
    const { email, firstName, lastName, notificationId } = params;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing) {
      logger.warn("email_onboarding_duplicate", {
        event: "email_onboarding_duplicate",
        service: SERVICE_NAME,
        email: normalizedEmail,
        requestId: requestContext.get()?.requestId,
      });
      throw AppError.conflict("Email already registered");
    }

    const token = uuidv4();
    const link = `${process.env.WEB_ORIGIN}/onboarding/verify-email?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;
    const expiresAt = Date.now() + ONBOARDING_EXPIRATION_SEC * 1000;

    await setOnboardingData({
      email: normalizedEmail,
      step: "email",
      firstName,
      lastName,
      tokenObject: { token, expiresAt },
    });

    publishNotificationEmailConfirmation({
      email: normalizedEmail,
      firstName,
      lastName,
      notificationId: notificationId ?? uuidv4(),
      verificationUrl: link,
    });

    logger.info("email_onboarding_initiated", {
      event: "email_onboarding_initiated",
      service: SERVICE_NAME,
      email: normalizedEmail,
      requestId: requestContext.get()?.requestId,
    });
  },

  async confirmEmailToken(params: ConfirmEmailTokenDto): Promise<void> {
    const { email, token } = params;
    const key = getRedisOnboardingKey(email);
    const raw = await redisClient.get(key);

    if (!raw) {
      logger.warn("email_token_confirm_no_session", {
        event: "email_token_confirm_no_session",
        service: SERVICE_NAME,
        email,
        requestId: requestContext.get()?.requestId,
      });
      throw AppError.badRequest(
        "No onboarding session found. Please restart the process."
      );
    }

    const onboardingData = JSON.parse(raw);

    if (onboardingData.tokenObject?.token !== token) {
      logger.warn("email_token_confirm_invalid", {
        event: "email_token_confirm_invalid",
        service: SERVICE_NAME,
        email,
        requestId: requestContext.get()?.requestId,
      });
      throw AppError.badRequest("The token provided is not valid.");
    }

    if (Date.now() > (onboardingData.tokenObject?.expiresAt ?? 0)) {
      logger.warn("email_token_confirm_expired", {
        event: "email_token_confirm_expired",
        service: SERVICE_NAME,
        email,
        requestId: requestContext.get()?.requestId,
      });
      throw AppError.badRequest(
        "The token has expired. Please retry the onboarding flow."
      );
    }

    logger.info("email_token_confirmed", {
      event: "email_token_confirmed",
      service: SERVICE_NAME,
      email,
      requestId: requestContext.get()?.requestId,
    });
  },

  async setOnboardingPassword(
    params: SetOnboardingPasswordDto
  ): Promise<void> {
    const { email, password } = params;
    const key = getRedisOnboardingKey(email);
    const raw = await redisClient.get(key);

    if (!raw) {
      logger.warn("password_step_no_session", {
        event: "password_step_no_session",
        service: SERVICE_NAME,
        email,
        requestId: requestContext.get()?.requestId,
      });
      throw AppError.badRequest(
        "No onboarding session found. Please restart the process."
      );
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    await setOnboardingData({ email, passwordHash, step: "password" });

    logger.info("password_step_completed", {
      event: "password_step_completed",
      service: SERVICE_NAME,
      email,
      requestId: requestContext.get()?.requestId,
    });
  },

  //  REGISTRATION 

  async registerUser(
    params: RegisterUserDto
  ): Promise<RegisterUserResponseDto> {
    const { email, userType, phone, address, gender } = params;
    const normalizedEmail = email.toLowerCase().trim();

    const onboardingData = await getOnboardingState(normalizedEmail);
    if (!onboardingData || onboardingData.step !== "password") {
      logger.warn("registration_incomplete_onboarding", {
        event: "registration_incomplete_onboarding",
        service: SERVICE_NAME,
        email: normalizedEmail,
        currentStep: onboardingData?.step,
        requestId: requestContext.get()?.requestId,
      });
      throw AppError.badRequest(
        "Please complete all onboarding steps first."
      );
    }

    const { passwordHash, firstName, lastName } = onboardingData;
    const organizationType = deriveOrganizationType(userType);
    const session = await mongoose.startSession();

    let user!: IUser;

    await session.withTransaction(async () => {
      const existing = await userRepository.findByEmail(
        normalizedEmail,
        undefined,
        session
      );

      if (existing) {
        throw AppError.conflict(
          "An account with this email already exists."
        );
      }

      const normalizedPhone = phone.startsWith("0")
        ? normalizePhoneNumber(phone)
        : phone;

      const [created] = await userRepository.create(
        [
          {
            email: normalizedEmail,
            passwordHash,
            firstName,
            lastName,
            userType,
            organizationType,
            isEmailVerified: true,
            phone: normalizedPhone,
            address,
            gender: gender as IUser["gender"],
            status: "draft" as IUser["status"],
          },
        ],
        session
      );

      user = created;
    });

    session.endSession();

    requestContext.set({
      userId: user._id.toString(),
      eventType: "user.registered",
    });

    if (userType !== UserType.CUSTOMER) {
      publishUserOnboardingCompleted({
        userId: user._id.toString(),
        organizationId: "",
        organizationType,
        email: normalizedEmail,
        ownerName: `${firstName ?? ""} ${lastName ?? ""}`.trim(),
        billingPlan: "FREE",
      });

      logger.info("user_onboarding_event_published", {
        event: "user_onboarding_event_published",
        service: SERVICE_NAME,
        userId: user._id.toString(),
        userType,
        organizationType,
        requestId: requestContext.get()?.requestId,
      });
    }

    await deleteOnboardingState(normalizedEmail);

    logger.info("user_registered", {
      event: "user_registered",
      service: SERVICE_NAME,
      userId: user._id.toString(),
      userType,
      organizationType,
      requestId: requestContext.get()?.requestId,
    });

    return {
      userId: user._id.toString(),
      email: user.email,
      userType: user.userType,
      organizationType: user.organizationType,
    };
  },

  //  LOGIN 

  async initiateLogin(
    params: InitiateLoginDto
  ): Promise<{ email: string }> {
    const { email, password, idempotencyKey, ip, userAgent } = params;
    const notificationId = idempotencyKey ?? uuidv4();
    const cacheKey = `user:${email}`;

    let user: IUser | null = null;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      user = JSON.parse(cached) as IUser;
      logger.debug("login_cache_hit", {
        event: "login_cache_hit",
        service: SERVICE_NAME,
        email,
        requestId: requestContext.get()?.requestId,
      });
    } else {
      user = await userRepository.findByEmail(
        email,
        "+passwordHash +phone +email +userType +firstName +lastName +organizationId +organizationType +status"
      );

      if (user) {
        await redisClient.setex(
          cacheKey,
          BASE_EXPIRATION_SEC,
          JSON.stringify(user)
        );
      }
    }

    if (!user) {
      logger.warn("login_user_not_found", {
        event: "login_user_not_found",
        service: SERVICE_NAME,
        email,
        ip,
        userAgent,
        requestId: requestContext.get()?.requestId,
      });
      throw AppError.unauthorized(
        "No account found with this email. Please sign up."
      );
    }

    if (user.falseIdentificationFlag) {
      logger.warn("login_blocked_false_flag", {
        event: "login_blocked_false_flag",
        service: SERVICE_NAME,
        userId: user._id.toString(),
        email,
        ip,
        requestId: requestContext.get()?.requestId,
      });
      throw AppError.forbidden(
        "Your account has been restricted. Please contact support."
      );
    }

    const isValidPassword = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!isValidPassword) {
      logger.warn("login_invalid_password", {
        event: "login_invalid_password",
        service: SERVICE_NAME,
        userId: user._id.toString(),
        email,
        requestId: requestContext.get()?.requestId,
      });
      throw AppError.badRequest("Invalid password credentials.");
    }

    const fullName =
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
    const twoFAToken = await generateSecureToken(
      user._id.toString(),
      "2fa"
    );
    const normalizedPhone = user.phone?.startsWith("0")
      ? normalizePhoneNumber(user.phone)
      : user.phone;

    await redisClient.setex(
      `2fa:${user.email}`,
      REDIS_EXPIRATION_MIN,
      JSON.stringify({
        token: twoFAToken,
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
      })
    );

    publishNotification2FA({
      token: twoFAToken,
      phone: normalizedPhone,
      notificationId,
      email: user.email,
      fullName,
    });

    logger.info("2fa_token_issued", {
      event: "2fa_token_issued",
      service: SERVICE_NAME,
      userId: user._id.toString(),
      email,
      requestId: requestContext.get()?.requestId,
    });

    return { email: user.email };
  },

  //  2FA VERIFY 

  async verify2FA(
    params: Verify2FADto & { res: Response }
  ): Promise<AuthTokensDto> {
    const { email, otp, res } = params;

    const user = await userRepository.findByEmail(
      email,
      "-passwordHash +organizationId +organizationType +status"
    );

    if (!user) {
      logger.warn("2fa_verify_user_not_found", {
        event: "2fa_verify_user_not_found",
        service: SERVICE_NAME,
        email,
        requestId: requestContext.get()?.requestId,
      });
      throw AppError.badRequest("User not found.");
    }

    const cachedRaw = await redisClient.get(`2fa:${email}`);
    if (!cachedRaw) {
      logger.warn("2fa_verify_no_cached_token", {
        event: "2fa_verify_no_cached_token",
        service: SERVICE_NAME,
        userId: user._id.toString(),
        email,
        requestId: requestContext.get()?.requestId,
      });
      throw AppError.badRequest("Invalid or expired 2FA token.");
    }

    const cachedToken = JSON.parse(cachedRaw) as {
      token: string;
      expiresAt: string;
    };

    if (
      cachedToken.token !== otp ||
      Date.now() > new Date(cachedToken.expiresAt).getTime()
    ) {
      logger.warn("2fa_verify_invalid_token", {
        event: "2fa_verify_invalid_token",
        service: SERVICE_NAME,
        userId: user._id.toString(),
        email,
        requestId: requestContext.get()?.requestId,
      });
      throw AppError.badRequest("Invalid or expired 2FA token.");
    }

    // Block non-customer sellers whose org onboarding saga has not yet completed
    if (
      user.userType !== UserType.CUSTOMER &&
      user.status !== "active"
    ) {
      logger.warn("2fa_verify_org_not_active", {
        event: "2fa_verify_org_not_active",
        service: SERVICE_NAME,
        userId: user._id.toString(),
        status: user.status,
        requestId: requestContext.get()?.requestId,
      });
      throw AppError.forbidden(
        "Your account setup is still processing. Please try again in a moment."
      );
    }

    const fullName =
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

    const { accessToken, refreshToken } = await generateToken(
      res,
      user._id.toString(),
      user.userType,
      fullName,
      user.organizationId?.toString() ?? "",
      user.organizationType
    );

    await redisClient.del(`2fa:${email}`);

    requestContext.set({
      userId: user._id.toString(),
      organizationId: user.organizationId?.toString(),
      eventType: "user.login",
    });

    logger.info("2fa_verify_success", {
      event: "2fa_verify_success",
      service: SERVICE_NAME,
      userId: user._id.toString(),
      email,
      organizationId: user.organizationId?.toString(),
      requestId: requestContext.get()?.requestId,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        userId: user._id.toString(),
        userType: user.userType,
        organizationId: user.organizationId?.toString() ?? "",
        organizationType: user.organizationType,
        name: fullName,
        roles: [],
      },
    };
  },

  //  REFRESH TOKEN 

  async refreshToken(
    params: RefreshTokenDto
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { refreshToken, ip, userAgent } = params;

    const cached = await redisClient.get(`refresh:${refreshToken}`);
    if (!cached) {
      logger.warn("refresh_token_not_found", {
        event: "refresh_token_not_found",
        service: SERVICE_NAME,
        ip,
        userAgent,
        requestId: requestContext.get()?.requestId,
      });
      throw AppError.unauthorized("Invalid or expired refresh token.");
    }

    const { userId, userType, name } = JSON.parse(cached) as {
      userId: string;
      userType: UserType;
      name: string;
    };

    const user = await userRepository.findById(
      userId,
      "-passwordHash +organizationId +organizationType"
    );

    if (!user) {
      throw AppError.badRequest("User not found.");
    }

    const newAccessToken = await signJwt(
      user._id.toString(),
      userType,
      name,
      user.organizationId?.toString() ?? "",
      user.organizationType
    );

    const newRefreshToken = await generateSecureToken(
      user._id.toString(),
      "refresh"
    );

    await redisClient.set(
      `refresh:${newRefreshToken}`,
      JSON.stringify({ userId: user._id, userType, name }),
      "EX",
      BASE_EXPIRATION_SEC
    );
    await redisClient.del(`refresh:${refreshToken}`);

    logger.info("refresh_token_rotated", {
      event: "refresh_token_rotated",
      service: SERVICE_NAME,
      userId: user._id.toString(),
      ip,
      userAgent,
      requestId: requestContext.get()?.requestId,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  },

  //  PASSWORD RESET 

  async requestPasswordReset(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Intentional: never reveal whether email is registered
      logger.warn("password_reset_user_not_found", {
        event: "password_reset_user_not_found",
        service: SERVICE_NAME,
        email,
        requestId: requestContext.get()?.requestId,
      });
      return;
    }

    const token = await generateSecureToken(user._id.toString());

    await passwordResetRepository.create({
      token,
      userId: user._id,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    publishNotificationResetPassword({
      email,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      notificationId: uuidv4(),
      verificationUrl: `${process.env.WEB_ORIGIN}/reset-password/${token}`,
    });

    logger.info("password_reset_token_generated", {
      event: "password_reset_token_generated",
      service: SERVICE_NAME,
      userId: user._id.toString(),
      email,
      requestId: requestContext.get()?.requestId,
    });
  },

  async resetPassword(params: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = params;

    const resetToken = await passwordResetRepository.findByToken(token);
    if (!resetToken) {
      throw AppError.badRequest(
        "The password reset token is not valid. Please request a new one."
      );
    }

    if (resetToken.expiresAt < new Date()) {
      await passwordResetRepository.deleteById(
        resetToken._id.toString()
      );
      throw AppError.badRequest(
        "The password reset token has expired. Please request a new link."
      );
    }

    const user = await userRepository.findById(
      resetToken.userId.toString()
    );
    if (!user) {
      throw AppError.unauthorized("No account found for this token.");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await userRepository.updateById(user._id.toString(), {
      passwordHash,
    });
    await passwordResetRepository.deleteById(resetToken._id.toString());
    await redisClient.del(`user:${user.email}`);

    logger.info("password_reset_success", {
      event: "password_reset_success",
      service: SERVICE_NAME,
      userId: user._id.toString(),
      email: user.email,
      requestId: requestContext.get()?.requestId,
    });
  },

  async changePassword(params: {
    email: string;
    newPassword: string;
  }): Promise<void> {
    const { email, newPassword } = params;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await userRepository.updateByEmail(email, { passwordHash });
    await redisClient.del(`user:${email}`);

    logger.info("password_changed", {
      event: "password_changed",
      service: SERVICE_NAME,
      email,
      requestId: requestContext.get()?.requestId,
    });
  },

  //  LOGOUT 
  async logout(params: LogoutDto): Promise<void> {
    const { token, refreshToken, jwtSecret } = params;

    if (token) {
      try {
        const jwt = await import("jsonwebtoken");
        const decoded = jwt.verify(token, jwtSecret) as {
          exp: number;
          user: { userId: string };
        };
        const remainingTTL = decoded.exp - Math.floor(Date.now() / 1000);
        if (remainingTTL > 0) {
          await redisClient.set(
            `blocklist:${decoded.user.userId}`,
            "1",
            "EX",
            remainingTTL
          );
          logger.info("logout_token_blocklisted", {
            event: "logout_token_blocklisted",
            service: SERVICE_NAME,
            userId: decoded.user.userId,
            remainingTTL,
            requestId: requestContext.get()?.requestId,
          });
        }
      } catch {
        
      }
    }

    if (refreshToken) {
      await redisClient.del(`refresh:${refreshToken}`);
      logger.info("logout_refresh_token_deleted", {
        event: "logout_refresh_token_deleted",
        service: SERVICE_NAME,
        requestId: requestContext.get()?.requestId,
      });
    }
  },
};