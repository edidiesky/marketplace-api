import jwt from "jsonwebtoken";
import logger from "./logger";
import redisClient from "../config/redis";
import { nanoid } from "nanoid";
import { PermissionService } from "../services/permission.service";
export const signJwt = async (
  userId: string,
  role: string,
  name: string,
  tenantId: string,
  tenantType: string,
  tenantPlan: string,
): Promise<string> => {
  const permissions = await PermissionService.getUserPermissions(userId);
  const roleLevel = await PermissionService.getUserRoleLevel(userId);

  const payload = {
    user: {
      userId,
      role,
      name,
      tenantId,
      tenantType,
      tenantPlan,
      permissions,
      roleLevel,
    },
  };

  return jwt.sign(payload, process.env.JWT_CODE!, { expiresIn: "15m" });
};

export const generateToken = async (
  res: import("express").Response,
  userId: string,
  role: string,
  name: string,
  tenantId: string,
  tenantType: string,
  tenantPlan: string,
) => {
  try {
    const accessToken = await signJwt(userId, role, name, tenantId, tenantType, tenantPlan);
    const refreshToken = nanoid(32);
    await redisClient.set(
      `refresh:${refreshToken}`,
      JSON.stringify({ userId, role, name }),
      "EX",
      7 * 24 * 60 * 60,
    );
    res.cookie("jwt", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      path: "/",
    });

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error("Error generating token", {
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
};
