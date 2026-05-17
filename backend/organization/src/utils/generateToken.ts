import jwt from "jsonwebtoken";
import { Response } from "express";
import { nanoid } from "nanoid";
import redisClient from "../config/redis";
import { BASE_EXPIRATION_SEC } from "../constants";
import { UserType, OrganizationType } from "../domains/auth/auth.model";

export interface JWTUserPayload {
  userId:           string;
  userType:         UserType;
  organizationId:   string;
  organizationType: OrganizationType;
  name:             string;
}

export async function signJwt(
  userId:           string,
  userType:         UserType,
  name:             string,
  organizationId:   string,
  organizationType: OrganizationType
): Promise<string> {
  const payload: JWTUserPayload = {
    userId,
    userType,
    organizationId,
    organizationType,
    name,
  };
  return jwt.sign({ user: payload }, process.env.JWT_CODE!, {
    expiresIn: "15m",
    issuer:    "selleasi",
    audience:  "selleasi-client",
  });
}

export async function generateToken(
  res:              Response,
  userId:           string,
  userType:         UserType,
  name:             string,
  organizationId:   string,
  organizationType: OrganizationType
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken  = await signJwt(
    userId, userType, name, organizationId, organizationType
  );
  const refreshToken = nanoid(32);

  await redisClient.set(
    `refresh:${refreshToken}`,
    JSON.stringify({ userId, userType, name }),
    "EX",
    BASE_EXPIRATION_SEC
  );

  res.cookie("jwt", accessToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    expires:  new Date(Date.now() + 15 * 60 * 1000),
    path:     "/",
    sameSite: "strict",
  });

  return { accessToken, refreshToken };
}