import bcrypt from "bcryptjs";
import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import User, { UserType } from "../models/User";
import { v4 as uuidv4 } from "uuid";
import { generateToken, signJwt } from "../utils/generateToken";
import logger from "../utils/logger";
import { generateSecureToken } from "../utils/resetTokenGenerator";
import { PasswordResetToken } from "../models/ResetPassword";
import {
  BAD_REQUEST_STATUS_CODE,
  NOT_FOUND_STATUS_CODE,
  BASE_EXPIRATION_SEC,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SERVER_ERROR_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
  NOTIFICATION_ONBOARDING_EMAIL_CONFIRMATION_TOPIC,
  USER_ONBOARDING_COMPLETED_TOPIC,
  ONBOARDING_EXPIRATION_SEC,
  NOTIFICATION_AUTHENTICATION_2FA_TOPIC,
  REDIS_EXPIRATION_MIN,
} from "../constants";
import redisClient from "../config/redis";
import {
  measureDatabaseQuery,
  trackCacheHit,
  trackCacheMiss,
} from "../utils/metrics";
import { normalizePhoneNumber } from "../utils/normalizePhoneNumber";
import mongoose from "mongoose";
import {
  deleteOnboardingState,
  getOnboardingState,
  getRedisOnboardingKey,
  setOnboardingData,
} from "../utils/redisOnboarding";
import { IOnboarding } from "../types";
import { sendAuthenticationMessage } from "../messaging/producer";
import { UserRole } from "../models/Role";

/**
 * @description Handler email Onboarding step
 * @route POST /api/v1/auth/email/confirmation
 * @access Public
 */
export const HandleEmailOnboardingStep = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, firstName, lastName, notificationId } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      // Prevent duplicate
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        logger.error("Email already exists in the system:", email);
        throw new Error("Email already registered");
      }

      // Sending magic link
      const token = uuidv4();
      const link = `${
        process.env.WEB_ORIGIN
      }/onboarding/verify-email?token=${token}&email=${encodeURIComponent(
        normalizedEmail
      )}`;

      const expiresAt = Date.now() + ONBOARDING_EXPIRATION_SEC;
      // Saving to Redis
      await setOnboardingData({
        email: normalizedEmail,
        step: "email",
        firstName,
        lastName,
        tokenObject: {
          token,
          expiresAt,
        },
      });

      await sendAuthenticationMessage(
        NOTIFICATION_ONBOARDING_EMAIL_CONFIRMATION_TOPIC,
        {
          email,
          firstName,
          lastName,
          notificationId,
          verification_url: link,
        }
      );

      res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
        data: null,
        success: true,
        statusCode: SUCCESSFULLY_CREATED_STATUS_CODE,
        message: `Verification email has been to this email, ${email}. Please check your email to proceed to the next stage of onboarding`,
      });
    } catch (error) {
      logger.error("Email onboarding error:", {
        message:
          error instanceof Error
            ? error.message
            : "An unknown has occurred during email onboarding",
        stack:
          error instanceof Error
            ? error.stack
            : "An unknown has occurred during email onboarding",
      });
      res.status(SERVER_ERROR_STATUS_CODE).json({
        data: null,
        success: false,
        statusCode: SERVER_ERROR_STATUS_CODE,
        message:
          error instanceof Error
            ? error.message
            : "An unknown has occurred during email onboarding",
      });
    }
  }
);

/**
 * @description Handler email Onboarding Token confirmation step
 * @route GET /api/v1/auth/email/confirmation?email="email"&token="token"
 * @access Public
 */
export const HandleConfirmEmailToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, email } = req.query as { email: string; token: string };
      const key = getRedisOnboardingKey(email);
      const state = await redisClient.get(key);
      if (!state) {
        logger.error("No onboardign session found for the user:", {
          key,
          state,
        });
        throw new Error(
          "No onboarding session found for this process. Please kindly restart"
        );
      }
      let existingOnboardingData: IOnboarding = JSON.parse(state);

      if (existingOnboardingData.tokenObject?.token !== token) {
        throw new Error("The token provided is not valid for onboarding");
      }

      if (
        existingOnboardingData.tokenObject?.expiresAt &&
        Date.now() > (existingOnboardingData.tokenObject?.expiresAt ?? 0)
      ) {
        logger.error("Token has expired", {
          email,
          expiresAt: existingOnboardingData.tokenObject.expiresAt,
        });
        throw new Error(
          "The token provided has already expired please can u retry the onboarding flow again"
        );
      }

      res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
        data: null,
        success: true,
        message: "Email verified! Proceed to password verification.",
        nextStep: "password",
      });
    } catch (error) {
      logger.error("Email onboarding error:", {
        message:
          error instanceof Error
            ? error.message
            : "An unknown has occurred during email onboarding",
        stack:
          error instanceof Error
            ? error.stack
            : "An unknown has occurred during email onboarding",
      });
      res.status(SERVER_ERROR_STATUS_CODE).json({
        data: null,
        success: false,
        statusCode: SERVER_ERROR_STATUS_CODE,
        message:
          error instanceof Error
            ? error.message
            : "An unknown has occurred during email onboarding",
      });
    }
  }
);

/**
 * @description Handler password Onboarding step
 * @route POST /api/v1/auth/password/confirmation
 * @access Public
 */
export const HandlePasswordOnboardingStep = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { password, email } = req.body;
      const key = getRedisOnboardingKey(email);
      const state = await redisClient.get(key);
      if (!state) {
        logger.error("No onboardign session found for the user:", {
          key,
          state,
        });
        throw new Error(
          "No onboarding session found for this process. Please kindly restart"
        );
      }
      let salt = await bcrypt.genSalt(12);
      let hashedPassword = await bcrypt.hash(password, salt);

      await setOnboardingData({
        email,
        passwordHash: hashedPassword,
        step: "password",
      });

      res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
        data: {
          email,
        },
        success: true,
        statusCode: SUCCESSFULLY_CREATED_STATUS_CODE,
        message: `Verification Password set in place, kindly, proceed to the next stage of onboarding`,
      });
    } catch (error) {
      logger.error("Email onboarding error:", {
        message:
          error instanceof Error
            ? error.message
            : "An unknown has occurred during email onboarding",
        stack:
          error instanceof Error
            ? error.stack
            : "An unknown has occurred during email onboarding",
      });
      res.status(SERVER_ERROR_STATUS_CODE).json({
        data: null,
        success: false,
        statusCode: SERVER_ERROR_STATUS_CODE,
        message:
          error instanceof Error
            ? error.message
            : "An unknown has occurred during email onboarding",
      });
    }
  }
);

/**
 * @description Handler to Registers a new Client.
 * @route POST /api/v1/auth/signup
 * @access Public
 */
const RegisterUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { email, userType, phone, address, gender, plan, tenantType } =
        req.body;
      const normalizedEmail = email.toLowerCase().trim();

      // Get onboarding data
      const onboardingData = await getOnboardingState(normalizedEmail);
      if (!onboardingData || onboardingData.step !== "password") {
        logger.error("The user has not completed the onboarding steps", {
          step: onboardingData?.step,
        });
        throw new Error("Please kindly Complete all onboarding steps first");
      }

      const { passwordHash, firstName, lastName } = onboardingData;

      // Checking if the user exists
      const isUserExisting = await User.findOne({
        email: onboardingData.email,
      }).session(session);

      if (isUserExisting) {
        logger.error("Existing user is trying to crrate an account:", {
          email,
        });
        throw new Error(
          "Please, kindly login rather than creating an account since you have an existing account with us. "
        );
      }

      // Create User
      const [user] = await User.create(
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
        { session }
      );

      if (user && user.userType !== UserType.CUSTOMER) {
        await sendAuthenticationMessage(USER_ONBOARDING_COMPLETED_TOPIC, {
          ownerId: user?._id,
          ownerEmail: user?.email,
          ownerName: user?.firstName,
          type: tenantType,
          billingPlan: plan,
        });
      }
      // 3. Create Tenant
      // const tenant = await Tenant.create(
      //   [{
      //     ownerId: user[0]._id,
      //     ownerEmail: normalizedEmail,
      //     ownerName: `${onboardingData.firstName} ${onboardingData.lastName}`,
      //     type: TenantType.SELLER_INDIVIDUAL,
      //     status: TenantStatus.DRAFT,
      //     billingPlan: BillingPlan.FREE,
      //     trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      //   }],
      //   { session }
      // );

      // 5. Commit transaction
      await session.commitTransaction();
      // 6. Delete Redis state
      await deleteOnboardingState(normalizedEmail);
      logger.info("User account has been created succesfully.", {
        data: user?._id,
      });

      res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
        success: true,
        data: user?._id,
        message:
          "Your account is processing. You can kindly check your mail for futher step or extra information for setting up an acccunt",
      });
    } catch (error: any) {
      await session.abortTransaction();

      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        const value = error.keyValue[field];
        throw new Error(`Duplicate ${field}: ${value}`);
      }

      logger.error("Signup error:", {
        message:
          error instanceof Error
            ? error.message
            : "An unknown has occurred during creating an account",
        stack:
          error instanceof Error
            ? error.stack
            : "An unknown has occurred during creating an account",
      });

      res.status(BAD_REQUEST_STATUS_CODE).json({
        success: false,
        data: null,
        message:
          error instanceof Error
            ? error.message
            : "Please kindly reach out to the support team, if error continues after retry",
      });
    } finally {
      session.endSession();
    }
  }
);

/**
 * @description Handler to login the user and also initialize 2FA
 * @route POST /api/v1/auth/login
 * @access Public
 * @param {object} req.body - { email, password }
 */

const LoginUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, password, idempotencyKey } = req.body;
    const notificationId = idempotencyKey ? idempotencyKey : uuidv4();

    const cacheKey = `user:${email}`;
    let cachedUser = await redisClient.get(cacheKey);
    let user: any;
    if (cachedUser) {
      trackCacheHit("redis", "user_login_lookup");
      user = JSON.parse(cachedUser);
    } else {
      trackCacheMiss("redis", "user_lookup");
      user = await measureDatabaseQuery("login", async () =>
        User.findOne({ email }).select(
          "+passwordHash +phone +email +userType +firstName +lastName"
        )
      );

      if (user) {
        await redisClient.setex(
          cacheKey,
          BASE_EXPIRATION_SEC,
          JSON.stringify(user.toObject())
        );
      }
    }

    if (!user) {
      logger.info("User with invalid email attempting to sign in", {
        email,
        ip: req.headers["x-forwarded-for"],
        userAgent: req.headers["user-agent"],
      });
      res.status(NOT_FOUND_STATUS_CODE);
      throw new Error(
        "This user does not have any record with us. Please sign up."
      );
    }

    // Check for false identification flag
    if (user.falseIdentificationFlag) {
      logger.warn("Login attempt blocked due to false identification flag", {
        email,
        ip: req.headers["x-forwarded-for"],
      });
      res.status(BAD_REQUEST_STATUS_CODE).json({
        message:
          "Your account has been restricted due to suspected false information. Please contact support to resolve this issue.",
        status: "error",
      });
      return;
    }
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      logger.error("Please provide a valid password!", {
        password,
      });
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error(
        "Invalid password credentials provided. Please kindly try again."
      );
    }
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    // Generate 2FA token
    const twoFAToken = await generateSecureToken(user._id.toString(), "2fa");
    const { phone } = user;
    const normalizedPhone = phone!.startsWith("0")
      ? normalizePhoneNumber(phone!)
      : phone;

    await redisClient.setex(
      `2fa:${user.email}`,
      REDIS_EXPIRATION_MIN,
      JSON.stringify({
        token: twoFAToken,
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      })
    );

    // // REPORTING EVENT
    // await sendAuthenticationMessage(USER_LOGIN_TOPIC, {
    //   user: {
    //     userId: user._id,
    //     email: user.email,
    //     userType: user.userType,
    //     loginTime: new Date(),
    //     ipAddress: req.ip,
    //     userAgent: req.headers["user-agent"],
    //     twoFATokenSent: true,
    //   },
    // });

    await sendAuthenticationMessage(NOTIFICATION_AUTHENTICATION_2FA_TOPIC, {
      token: twoFAToken,
      phone: normalizedPhone,
      notificationId,
      email: user?.email,
      fullName,
      message: `Hi, ${fullName}, Your 2FA code for SelleaSY signin is ${twoFAToken}. It expires in 5 minutes.`,
    });
    res.status(200).json({
      message:
        "A 2FA token has been sent to your registered email. Please verify to complete login.",
      email: user.email,
    });
  }
);

/**
 * @description Verifies the 2FA token and issues JWT.
 * @route POST /api/v1/auth/verify-2fa
 * @access Public
 * @param {object} req.body - { email, otp }
 */
const Verify2FA = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, otp } = req.body;
    // Find user
    const user = await measureDatabaseQuery(
      "2FA",
      async () => await User.findOne({ email }).select("-passwordHash")
    );

    if (!user) {
      logger.error("This user does not exists", { email });
      res.status(NOT_FOUND_STATUS_CODE);
      throw new Error("This user does not have any record with us");
    }

    // Retrieve 2FA token from Redis
    const cachedTokenStr = await redisClient.get(`2fa:${email}`);
    if (!cachedTokenStr) {
      logger.error("No 2FA token found in cache", { email });
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("You provided an invalid or expired 2FA token");
    }

    const cachedToken = JSON.parse(cachedTokenStr);
    if (
      cachedToken.token !== otp ||
      Date.now() > Number(cachedToken.expiresAt)
    ) {
      logger.error("Invalid or expired 2FA token", { email });
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("You provided an invalid or expired 2FA token");
    }

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const { accessToken, refreshToken } = await generateToken(
      res,
      user._id.toString(),
      user.userType,
      fullName
    );

    await User.updateOne({ email }, { $set: { lastActiveAt: new Date() } });
    logger.info("User signed in succesfully using 2FA", {
      email,
      service: "auth_service",
    });
    await redisClient.del(`2fa:${email}`);

    res.status(200).json({
      accessToken,
      refreshToken,
      user,
    });
  }
);

/**
 * @description It reset the password of a user
 * @route POST /api/v1/auth/request-reset
 * @access Public (it does not need a JWT authentication)
 * @param {object} req.body
 */
const RequestPasswordResetHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    if (!email) {
      res.status(BAD_REQUEST_STATUS_CODE).json({
        message: `Please provide a valid Client Identification Number (email).`,
      });
      return;
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(NOT_FOUND_STATUS_CODE).json({
        message: `No account found for the provided email. Please verify the email or register a new account.`,
      });
      return;
    }

    // Generate reset token
    const token = await generateSecureToken(user._id.toString());
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    // Send reset email
    // await sendUserMessage("tms.auth.password.rest.token", {
    //   email: user?.email,
    //   token,
    //   name: fullName,
    // });

    res.status(200).json({
      message:
        "A password reset link has been sent to your registered email address. Please check your inbox or spam folder.",
    });
  }
);

/**
 * @description Refreshes the JWT using a refresh token.
 * @route POST /api/v1/auth/refresh-token
 * @access Public
 */
const RefreshToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("Refresh token is required");
    }

    // Verify refresh token in Redis
    const cachedRefreshToken = await redisClient.get(`refresh:${refreshToken}`);
    if (!cachedRefreshToken) {
      res.status(401);
      throw new Error("Invalid or expired refresh token");
    }

    const { email, userType, name } = JSON.parse(cachedRefreshToken);

    // Generate new access token
    const newAccessToken = signJwt(email, userType, name);
    // Generate new refresh otken
    const newRefreshToken = await generateSecureToken(email, "refresh");
    // persist the new refresh token in redis.
    await redisClient.set(
      `refresh:${newRefreshToken}`,
      JSON.stringify({ email, userType, name }),
      "EX",
      BASE_EXPIRATION_SEC
    );
    // Set new access token in cookie
    res.cookie("jwt", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(Date.now() + 15 * 60 * 1000),
      path: "/",
    });

    await redisClient.del(`refresh:${refreshToken}`);
    logger.info("Refresh token rotated", {
      userId: email,
      ip: req.headers["x-forwarded-for"],
      userAgent: req.headers["user-agent"],
    });
    res
      .status(200)
      .json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  }
);

/**
 * @description Handler to reset user password
 * @returns
 */
const ResetPasswordHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Validate input
    const { token, newPassword } = req.body;

    if (!token || typeof token !== "string") {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("Invalid or missing password reset token");
    }

    if (!newPassword || typeof newPassword !== "string") {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("Invalid or missing new password");
    }

    // Find the reset token
    const resetToken = await PasswordResetToken.findOne({ token });
    if (!resetToken) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error(
        "The provided password reset token is not valid. Please request for a new token"
      );
    }

    // Check if token has expired
    if (resetToken.expiresAt < new Date()) {
      await resetToken.deleteOne();
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error(
        "The password reset token has expired. Please request a new reset link."
      );
    }

    // Find the user
    const user = await User.findById(resetToken.userId);
    if (!user) {
      res.status(NOT_FOUND_STATUS_CODE);
      throw new Error(
        "No account found for the provided token. Please verify your details or register a new account"
      );
    }

    try {
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      // Update the user's password
      user.passwordHash = passwordHash;
      await user.save();

      // Delete the reset token
      await resetToken.deleteOne();

      // Update Redis cache
      const cacheKey = `user:${user.email}`;
      const userObject = user.toObject();
      await redisClient.setex(
        cacheKey,
        BASE_EXPIRATION_SEC,
        JSON.stringify(userObject)
      );

      logger.info("Password reset successfully", { email: user.email });

      res.status(200).json({
        message:
          "Your password has been successfully reset. You can now log in with your new password",
      });
    } catch (error) {
      logger.error("Error during password reset process", {
        error:
          error instanceof Error
            ? error.message
            : "an unknown error has occurred",
        stack:
          error instanceof Error
            ? error.stack
            : "an unknown error stack has occurred",
        token,
        userId: user?._id,
      });
      res.status(500);
      throw new Error("An error occurred while resetting the password");
    }
  }
);

/**
 *
 * @description Handler to change user password
 * @returns
 */
const ChangePasswordHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { newPassword, email } = req.body;
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await User.updateOne(
      { email },
      {
        passwordHash,
      }
    );
    res.status(200).json({ message: "Password reset successfully" });
  }
);

/**
 * @description Handler to logout user
 * @returns
 */
const LogoutUserHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    res.cookie("jwt", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || false,
    });
    logger.info("User logged out successfully:");
    res.status(200).json({ message: "Logged out succesfully!!" });
  }
);

export {
  RegisterUser,
  LoginUser,
  LogoutUserHandler,
  RequestPasswordResetHandler,
  ResetPasswordHandler,
  ChangePasswordHandler,
  Verify2FA,
  RefreshToken,
};
