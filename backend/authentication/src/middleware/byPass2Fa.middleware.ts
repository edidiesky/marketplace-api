import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import redisClient from "../config/redis";
import { userRepository } from "../repository/user.repository";
import bcrypt from "bcryptjs";
import logger from "../utils/logger";

const isBypassActive = (): boolean => {
  return (
    process.env.NODE_ENV === "test" && process.env.BYPASS_2FA === "true"
  );
};

export const bypass2FAMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!isBypassActive()) {
    next();
    return;
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      next();
      return;
    }

    const user = await userRepository.findByEmail(email);

    if (!user) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    if (user.tenantStatus !== "ACTIVE" && user.userType !== "CUSTOMER") {
      res.status(403).json({
        success: false,
        message: "Tenant not yet active",
      });
      return;
    }

    // Issue tokens exactly as verify-otp would
    const accessToken = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.userType,
        name: `${user.firstName} ${user.lastName}`,
        tenantId: user.tenantId,
        tenantType: user.tenantType,
        tenantPlan: user.tenantPlan,
        permissions: [],
        roleLevel: 4,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "15m" }
    );

    const refreshToken = nanoid(32);
    const refreshTTL = parseInt(process.env.BASE_EXPIRATION_SEC || "604800");

    await redisClient.setex(
      `refresh:${user._id.toString()}`,
      refreshTTL,
      refreshToken
    );

    logger.info("BYPASS_2FA: token issued for load test", {
      userId: user._id.toString(),
      email: user.email,
      env: process.env.NODE_ENV,
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.userType,
          tenantId: user.tenantId,
          tenantStatus: user.tenantStatus,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};