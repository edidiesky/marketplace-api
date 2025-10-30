import bcrypt from "bcryptjs";
import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import User, {
  IUser,
  NationalType,
  UserType,
  VerificationStatus,
} from "../models/User";
import { v4 as uuidv4 } from "uuid";
import { generateToken, signJwt } from "../utils/generateToken";
import { generateUniquePassword } from "../utils/generatePassword";
import logger from "../utils/logger";
import { generateSecureToken } from "../utils/resetTokenGenerator";
import { PasswordResetToken } from "../models/ResetPassword";
// import { sendUserMessage } from "../messaging/producer";
import {
  ACCOUNT_RESTRICTION,
  ACCOUNT_UNRESTRICTION,
  BAD_REQUEST_STATUS_CODE,
  BULK_TAXPAYER_SMS_TOPIC,
  LOGIN_2FA_TOPIC,
  NOT_FOUND_STATUS_CODE,
  REDIS_TTL,
  SERVER_ERROR_STATUS_CODE,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  USER_LOGIN_TOPIC,
  USER_NOTIFICATION_SUCCESS,
  USER_REGISTRATION_TOPIC,
} from "../constants";
import redisClient from "../config/redis";
import {
  measureDatabaseQuery,
  trackCacheHit,
  trackCacheMiss,
} from "../utils/metrics";
import { normalizePhoneNumber } from "../utils/normalizePhoneNumber";
import mongoose from "mongoose";
import { Role, UserRole } from "../models/Role";

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
    } catch (error: any) {
      if (error.code === 11000) {
        // Duplicate key error
        const duplicateField = error.keyPattern
          ? Object.keys(error.keyPattern)[0]
          : "unknown";
        const duplicateValue = error.keyValue
          ? error.keyValue[duplicateField]
          : "unknown";
        res.status(BAD_REQUEST_STATUS_CODE).json({
          message: `Duplicate value for ${duplicateField}: ${duplicateValue}. This already exists.`,
          status: "error",
        });
        return;
      }
    }
  }
);

/**
 * @description Hnadler to login the user and also initialize 2FA
 * @route POST /api/v1/auth/login
 * @access Public
 * @param {object} req.body - { email, password }
 */
const LoginUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, password, idempotencyKey } = req.body;
    const notificationId = idempotencyKey ? idempotencyKey : uuidv4();

    // Validate input
    if (!email || !password) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("email and password are required");
    }

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
          REDIS_TTL,
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
      throw new Error("You do not have any record with us!!");
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
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("Please provide a valid password!");
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
      15 * 60,
      JSON.stringify({
        token: twoFAToken,
        expiresAt: new Date(Date.now() + 900000).toISOString(),
      })
    );

    // // REPORTING EVENT
    // await sendUserMessage(USER_LOGIN_TOPIC, {
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
    // // Send 2FA code via SMS and email
    // await sendUserMessage(LOGIN_2FA_TOPIC, {
    //   token: twoFAToken,
    //   phone: normalizedPhone,
    //   notificationId,
    //   email: user?.email,
    //   fullName,
    //   message: `Hi, ${fullName}, Your 2FA code for AKIRS signin is ${twoFAToken}. It expires in 5 minutes.`,
    // });
    res.status(200).json({
      message: "2FA code has been sent to your phone and email. Please verify.",
      userId: user.email,
    });
  }
);

/**
 * @description Verifies the 2FA token and issues JWT.
 * @route POST /api/v1/auth/verify-2fa
 * @access Public
 * @param {object} req.body - { userId, twoFAToken }
 */
const Verify2FA = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId, twoFAToken } = req.body;
    // Validate input
    if (!userId || !twoFAToken) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("userId and 2FA token are required");
    }

    // Find user
    const user = await measureDatabaseQuery(
      "2FA",
      async () => await User.findOne({ email: userId }).select("-passwordHash")
    );

    if (!user) {
      logger.error("This user does not exists", { userId });
      res.status(NOT_FOUND_STATUS_CODE);
      throw new Error("This user does not exists in AKIRS database");
    }

    // Retrieve 2FA token from Redis
    const cachedTokenStr = await redisClient.get(`2fa:${userId}`);
    if (!cachedTokenStr) {
      logger.error("No 2FA token found in cache", { userId });
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("Invalid or expired 2FA token");
    }

    const cachedToken = JSON.parse(cachedTokenStr);
    if (
      cachedToken.token !== twoFAToken ||
      new Date(cachedToken.expiresAt) < new Date()
    ) {
      logger.error("Invalid or expired 2FA token", { userId });
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("Invalid or expired 2FA token");
    }

    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    const { accessToken, refreshToken } = await generateToken(
      res,
      user.email,
      user.userType,
      fullName
    );

    await User.updateOne(
      { email: userId },
      { $set: { lastActiveAt: new Date() } }
    );
    logger.info("User signned in succesfully using 2FA", {
      userId,
      service: "auth_service",
    });
    await redisClient.del(`2fa:${userId}`);

    res.status(200).json({
      accessToken,
      refreshToken,
      user,
    });
  }
);

/**
 * @description Restricts an account by setting falseIdentificationFlag to true.
 * @route POST /api/v1/auth/restrict-account
 * @access Protected (Admin/SuperAdmin only)
 * @param {object} req.body - { email }
 */
const RestrictAccountHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;
  const { userId: restrictedByTin, name: restrictedByName } = req.user || {
    userId: "SYSTEM",
    name: "SYSTEM",
  };
  // Validate input
  if (!email) {
    res.status(BAD_REQUEST_STATUS_CODE);
    throw new Error("email is required");
  }

  // Check if user exists
  const user = await measureDatabaseQuery("restrictAccount", async () =>
    User.findOne({ email }).select("+falseIdentificationFlag")
  );

  if (!user) {
    res.status(NOT_FOUND_STATUS_CODE);
    throw new Error("User with the provided email not found");
  }

  // Check if already restricted
  if (user.falseIdentificationFlag) {
    res.status(BAD_REQUEST_STATUS_CODE).json({
      message: "Account is already restricted",
      status: "error",
    });
    return;
  }

  // Update falseIdentificationFlag
  await measureDatabaseQuery("updateRestriction", async () =>
    User.updateOne(
      { email },
      {
        $set: { falseIdentificationFlag: true },
        $currentDate: { updatedAt: true },
      }
    )
  );

  // Fetch updated user to update cache
  const updatedUser = await measureDatabaseQuery("fetchUpdatedUser", async () =>
    User.findOne({ email }).select("+falseIdentificationFlag")
  );

  if (!updatedUser) {
    logger.error("Updated user not found after restriction update", {
      email,
    });
    res.status(SERVER_ERROR_STATUS_CODE).json({
      message: "Failed to retrieve updated user data.",
      status: "error",
    });
    return;
  }

  // Invalidate old cache and set new cache
  const cacheKey = `user:${email}`;
  await redisClient.del(cacheKey);

  try {
    await redisClient.setex(
      cacheKey,
      REDIS_TTL,
      JSON.stringify(updatedUser.toObject())
    );
    logger.info("Cache updated with unrestricted user data", {
      email,
      cacheKey,
      ttl: REDIS_TTL,
    });
  } catch (cacheError) {
    logger.warn("Failed to update cache, but account unrestricted", {
      email,
      error: cacheError instanceof Error ? cacheError.message : cacheError,
    });
  }

  const fullName = `${updatedUser.firstName || ""} ${
    updatedUser.lastName || ""
  }`.trim();

  // await sendUserMessage(ACCOUNT_RESTRICTION, {
  //   restrictedTin: email,
  //   restrictedAccount: fullName,
  //   restrictedByTin,
  //   restrictedByName,
  // });

  logger.info("Account unrestricted successfully", {
    email,
    ip: req.ip,
    falseIdentificationFlag: updatedUser.falseIdentificationFlag,
  });

  res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
    message: "Account has been restricted successfully",
    data: { email },
    status: "success",
  });
};

/**
 * @description Handler Unrestricts an account by setting falseIdentificationFlag to false.
 * @route POST /api/v1/auth/unrestrict-account
 * @access Protected (Admin/SuperAdmin only)
 * @param {object} req.body - { email }
 */
const UnrestrictAccountHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    const { userId: restrictedByTin, name: restrictedByName } = req.user || {
      userId: "SYSTEM",
      name: "SYSTEM",
    };
    // Validate input
    if (!email) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("email is required");
    }

    // Check if user exists
    const user = await measureDatabaseQuery("unrestrictAccount", async () =>
      User.findOne({ email }).select("+falseIdentificationFlag")
    );

    if (!user) {
      res.status(NOT_FOUND_STATUS_CODE);
      throw new Error("User with the provided email not found");
    }

    // Check if already unrestricted
    if (!user.falseIdentificationFlag) {
      res.status(BAD_REQUEST_STATUS_CODE).json({
        message: "Account is already unrestricted",
        status: "error",
      });
      return;
    }

    // Update falseIdentificationFlag
    const updateResult = await measureDatabaseQuery(
      "updateUnrestriction",
      async () =>
        User.updateOne(
          { email },
          {
            $set: { falseIdentificationFlag: false },
            $currentDate: { updatedAt: true },
          }
        )
    );

    if (updateResult.modifiedCount === 0) {
      logger.error("Failed to update account restriction", {
        email,
        ip: req.ip,
      });
      res.status(SERVER_ERROR_STATUS_CODE).json({
        message: "Failed to unrestrict account. Please try again.",
        status: "error",
      });
      return;
    }

    // Fetch updated user to update cache
    const updatedUser = await measureDatabaseQuery(
      "fetchUpdatedUser",
      async () => User.findOne({ email }).select("+falseIdentificationFlag")
    );

    if (!updatedUser) {
      logger.error("Updated user not found after restriction update", {
        email,
      });
      res.status(SERVER_ERROR_STATUS_CODE).json({
        message: "Failed to retrieve updated user data.",
        status: "error",
      });
      return;
    }

    // Invalidate old cache and set new cache
    const cacheKey = `user:${email}`;
    await redisClient.del(cacheKey);

    try {
      await redisClient.setex(
        cacheKey,
        REDIS_TTL,
        JSON.stringify(updatedUser.toObject())
      );
      logger.info("Cache updated with unrestricted user data", {
        email,
        cacheKey,
        ttl: REDIS_TTL,
      });
    } catch (cacheError) {
      logger.warn("Failed to update cache, but account unrestricted", {
        email,
        error: cacheError instanceof Error ? cacheError.message : cacheError,
      });
    }

    const fullName = `${updatedUser.firstName || ""} ${
      updatedUser.lastName || ""
    }`.trim();

    // await sendUserMessage(ACCOUNT_UNRESTRICTION, {
    //   restrictedTin: email,
    //   restrictedAccount: fullName,
    //   restrictedByTin,
    //   restrictedByName,
    // });

    logger.info("Account unrestricted successfully", {
      email,
      ip: req.ip,
      falseIdentificationFlag: updatedUser.falseIdentificationFlag,
    });

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      message: "Account has been unrestricted successfully",
      data: {
        email,
      },
      status: "success",
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
      REDIS_TTL
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
      await redisClient.setex(cacheKey, REDIS_TTL, JSON.stringify(userObject));

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
  RestrictAccountHandler,
  UnrestrictAccountHandler,
};
