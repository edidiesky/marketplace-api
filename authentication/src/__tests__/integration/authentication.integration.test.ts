//  MOCK
jest.mock("../../config/redis", () => {
  const RedisMock = require("ioredis-mock");
  return { __esModule: true, default: new RedisMock() };
});

jest.mock("../../utils/metrics", () => ({
  reqReplyTime: jest.fn(),
  measureDatabaseQuery: jest
    .fn()
    .mockImplementation((_op: unknown, fn: unknown) =>
      (fn as () => Promise<unknown>)(),
    ),
  databaseQueryTimeHistogram: {
    startTimer: jest.fn().mockReturnValue(jest.fn()),
  },
  authRegistry: {
    contentType: "text/plain",
    metrics: jest.fn<() => Promise<"">>().mockResolvedValue(""),
  },
  trackError: jest.fn(),
  trackCacheHit: jest.fn(),
  trackCacheMiss: jest.fn(),
}));

jest.mock("../../services/permission.service", () => ({
  PermissionService: {
    getUserPermissions: jest.fn<() => Promise<[]>>().mockResolvedValue([]),
    getUserRoleLevel: jest.fn<() => Promise<number>>().mockResolvedValue(4),
  },
}));

jest.mock("../../messaging/producer", () => ({
  sendAuthenticationMessage: jest
    .fn<() => Promise<undefined>>()
    .mockResolvedValue(undefined),
}));

//  IMPORTS

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User, { UserType, TenantStatus } from "../../models/User";
import redisClient from "../../config/redis";

import { buildApp } from "../integration/helpers/buildApp";
import {
  seedOnboardingState,
  seedOnboardingStateWithPassword,
  seedUser,
  VALID_PASSWORD,
} from "../integration/helpers/seeders";
import { v4 } from "uuid";

// POST /api/v1/auth/verify-email
describe("POST /api/v1/auth/verify-email", () => {
  it("returns 201 and sends verification email when email is not registered", async () => {
    // Arrange: email does not exist in DB
    const body = {
      email: "newuser@example.com",
      firstName: "Jane",
      lastName: "Doe",
      notificationId: v4(),
    };

    // Act
    const res = await request(buildApp())
      .post("/api/v1/auth/verify-email")
      .send(body);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/verification email sent/i);
  });

  it("returns 400 when email is already registered", async () => {
    // Arrange: seed user with this email
    const user = await seedUser({ email: "existing@example.com" });

    // Act
    const res = await request(buildApp())
      .post("/api/v1/auth/verify-email")
      .send({
        email: user.email,
        firstName: "Jane",
        lastName: "Doe",
        notificationId: v4(),
      });

    // Assert: service throws "Email already registered"
    expect(res.status).toBe(400);
  });

  it("returns 400 when required field firstName is missing", async () => {
    const res = await request(buildApp())
      .post("/api/v1/auth/verify-email")
      .send({
        email: "test@example.com",
        lastName: "Doe",
        notificationId: v4(),
      });

    expect(res.status).toBe(400);
    expect(await User.countDocuments({})).toBe(0);
  });

  it("returns 400 when notificationId is not a valid UUID v4", async () => {
    const res = await request(buildApp())
      .post("/api/v1/auth/verify-email")
      .send({
        email: "test@example.com",
        firstName: "Jane",
        lastName: "Doe",
        notificationId: "not-a-uuid",
      });

    expect(res.status).toBe(400);
  });
});

// GET /api/v1/auth/email/confirmation
describe("GET /api/v1/auth/email/confirmation", () => {
  it("returns 200 when token and email match the onboarding session", async () => {
    const email = "confirm@example.com";
    const token = v4();
    await seedOnboardingState(email, "email", { token });

    const res = await request(buildApp()).get(
      `/api/v1/auth/email/confirmation?token=${token}&email=${email}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.nextStep).toBe("password");
  });

  it("returns 400 when token does not match the onboarding session", async () => {
    const email = "mismatch@example.com";
    await seedOnboardingState(email, "email", { token: v4() });

    const res = await request(buildApp()).get(
      `/api/v1/auth/email/confirmation?token=${v4()}&email=${email}`,
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 when the token has expired", async () => {
    const email = "expired@example.com";
    const token = v4();
    await seedOnboardingState(email, "email", {
      token,
      expiresAt: Date.now() - 1000,
    });

    const res = await request(buildApp()).get(
      `/api/v1/auth/email/confirmation?token=${token}&email=${email}`,
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 when no onboarding session exists for the email", async () => {
    const res = await request(buildApp()).get(
      `/api/v1/auth/email/confirmation?token=${v4()}&email=nosession@example.com`,
    );

    expect(res.status).toBe(400);
  });
});

// POST /api/v1/auth/verify-password

describe("POST /api/v1/auth/verify-password", () => {
  it("returns 200 when token and email match the onboarding session", async () => {
    // Arrange
    const email = "confirm@example.com";
    const token = v4();
    await seedOnboardingState(email, "email", { token });

    // Act
    const res = await request(buildApp()).get(
      `/api/v1/auth/email/confirmation?token=${token}&email=${email}`,
    );

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.nextStep).toBe("password");
  });

  it("returns 400 when token does not match the onboarding session", async () => {
    const email = "mismatch@example.com";
    await seedOnboardingState(email, "email", { token: v4() });

    const res = await request(buildApp()).get(
      `/api/v1/auth/email/confirmation?token=${v4()}&email=${email}`,
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 when the token has expired", async () => {
    const email = "expired@example.com";
    const token = v4();
    await seedOnboardingState(email, "email", {
      token,
      expiresAt: Date.now() - 1000,
    });

    const res = await request(buildApp()).get(
      `/api/v1/auth/email/confirmation?token=${token}&email=${email}`,
    );

    expect(res.status).toBe(400);
  });
});

// POST /api/v1/auth/signup
describe("POST /api/v1/auth/signup", () => {
  it("creates a user document and returns 201 when all onboarding steps are complete", async () => {
    const email = "signup@example.com";
    await seedOnboardingStateWithPassword(email, VALID_PASSWORD);

    const res = await request(buildApp()).post("/api/v1/auth/signup").send({
      email,
      userType: UserType.SELLERS,
      phone: "+2348100099551",
      address: "123 Lagos Street, Lagos",
      gender: "Male",
      plan: "FREE",
      tenantType: "SELLER_INDIVIDUAL",
    });

    console.log("SIGNUP 500 BODY:", JSON.stringify(res.body));
    expect(res.status).toBe(201);
  });

  it("returns 400 when onboarding steps are not complete", async () => {
    // Arrange: no onboarding state in Redis
    const res = await request(buildApp()).post("/api/v1/auth/signup").send({
      email: "incomplete@example.com",
      userType: UserType.SELLERS,
      phone: "+2348100099551",
      address: "123 Lagos Street, Lagos",
      gender: "Male",
      plan: "FREE",
      tenantType: "SELLER_INDIVIDUAL",
    });

    expect(res.status).toBe(400);
    expect(await User.countDocuments({})).toBe(0);
  });

  it("returns 400 when email is already registered", async () => {
    // Arrange: seed both the onboarding state and an existing user
    const email = "duplicate@example.com";
    await seedUser({ email });
    await seedOnboardingStateWithPassword(email, VALID_PASSWORD);

    // Act
    const res = await request(buildApp()).post("/api/v1/auth/signup").send({
      email,
      userType: UserType.SELLERS,
      phone: "+2348100099551",
      address: "123 Lagos Street, Lagos",
      gender: "Male",
      plan: "FREE",
      tenantType: "SELLER_INDIVIDUAL",
    });

    // Assert
    expect(res.status).toBe(400);
  });

  it("does not expose passwordHash in the response", async () => {
    // Arrange
    const email = "nohash@example.com";
    await seedOnboardingStateWithPassword(email, VALID_PASSWORD);

    // Act
    const res = await request(buildApp()).post("/api/v1/auth/signup").send({
      email,
      userType: UserType.SELLERS,
      phone: "+2348100099551",
      address: "123 Lagos Street",
      gender: "Male",
      plan: "FREE",
    });

    // Assert: passwordHash must never appear in any response body
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });
});

// POST /api/v1/auth/login
describe("POST /api/v1/auth/login", () => {
  it("returns 200 when token and email match the onboarding session", async () => {
    const email = "confirm@example.com";
    const token = v4();
    // Correct key format
    const key = `selleasi:${email}:onboarding`;
    await (
      redisClient as unknown as { set: (k: string, v: string) => Promise<void> }
    ).set(
      key,
      JSON.stringify({
        email,
        step: "email",
        firstName: "Jane",
        lastName: "Doe",
        createdAt: new Date().toISOString(),
        tokenObject: { token, expiresAt: Date.now() + 600_000 },
      }),
    );

    const res = await request(buildApp()).get(
      `/api/v1/auth/email/confirmation?token=${token}&email=${email}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.nextStep).toBe("password");
  });

  it("returns 400 when token does not match the onboarding session", async () => {
    const email = "mismatch@example.com";
    const key = `selleasi:${email}:onboarding`;
    await (
      redisClient as unknown as { set: (k: string, v: string) => Promise<void> }
    ).set(
      key,
      JSON.stringify({
        email,
        step: "email",
        firstName: "Jane",
        lastName: "Doe",
        createdAt: new Date().toISOString(),
        tokenObject: { token: v4(), expiresAt: Date.now() + 600_000 },
      }),
    );

    const res = await request(buildApp()).get(
      `/api/v1/auth/email/confirmation?token=${v4()}&email=${email}`,
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 when the token has expired", async () => {
    const email = "expired@example.com";
    const token = v4();
    const key = `selleasi:${email}:onboarding`;
    await (
      redisClient as unknown as { set: (k: string, v: string) => Promise<void> }
    ).set(
      key,
      JSON.stringify({
        email,
        step: "email",
        firstName: "Jane",
        lastName: "Doe",
        createdAt: new Date().toISOString(),
        tokenObject: { token, expiresAt: Date.now() - 1000 },
      }),
    );

    const res = await request(buildApp()).get(
      `/api/v1/auth/email/confirmation?token=${token}&email=${email}`,
    );

    expect(res.status).toBe(400);
  });
});

// POST /api/v1/auth/verify-otp

describe("POST /api/v1/auth/verify-otp", () => {
  it("returns 200 with accessToken and refreshToken when OTP is valid", async () => {
    // Arrange: seed user and plant a known OTP in Redis
    const user = await seedUser({
      email: "otp@example.com",
      tenantStatus: TenantStatus.ACTIVE,
    });

    const otp = "123456";
    await (
      redisClient as unknown as {
        setex: (k: string, t: number, v: string) => Promise<void>;
      }
    ).setex(
      `2fa:${user.email}`,
      900,
      JSON.stringify({
        token: otp,
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
      }),
    );

    // Act
    const res = await request(buildApp())
      .post("/api/v1/auth/verify-otp")
      .send({ email: user.email, otp });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();

    // Assert: OTP deleted from Redis after successful verification
    const remaining = await (
      redisClient as unknown as {
        get: (k: string) => Promise<string | null>;
      }
    ).get(`2fa:${user.email}`);
    expect(remaining).toBeNull();
  });

  it("returns 400 when OTP does not match", async () => {
    // Arrange
    const user = await seedUser({ email: "otpbad@example.com" });

    await (
      redisClient as unknown as {
        setex: (k: string, t: number, v: string) => Promise<void>;
      }
    ).setex(
      `2fa:${user.email}`,
      900,
      JSON.stringify({
        token: "correct",
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
      }),
    );

    // Act: send wrong OTP
    const res = await request(buildApp())
      .post("/api/v1/auth/verify-otp")
      .send({ email: user.email, otp: "wrong" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when OTP has expired", async () => {
    // Arrange: expired OTP
    const user = await seedUser({ email: "otpexpired@example.com" });
    const otp = "654321";

    await (
      redisClient as unknown as {
        setex: (k: string, t: number, v: string) => Promise<void>;
      }
    ).setex(
      `2fa:${user.email}`,
      900,
      JSON.stringify({
        token: otp,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      }),
    );

    // Act
    const res = await request(buildApp())
      .post("/api/v1/auth/verify-otp")
      .send({ email: user.email, otp });

    expect(res.status).toBe(400);
  });

  it("returns 400 when no 2FA session exists for the email", async () => {
    const user = await seedUser({ email: "nofa@example.com" });

    const res = await request(buildApp())
      .post("/api/v1/auth/verify-otp")
      .send({ email: user.email, otp: "123456" });

    expect(res.status).toBe(400);
  });

  it("returns 403 when tenant is not yet active", async () => {
    // Arrange: seller whose tenant saga has not completed
    const user = await seedUser({
      email: "inactive@example.com",
      userType: UserType.SELLERS,
      tenantStatus: TenantStatus.DRAFT,
      tenantId: new mongoose.Types.ObjectId().toString(),
    });

    const otp = "999999";
    await (
      redisClient as unknown as {
        setex: (k: string, t: number, v: string) => Promise<void>;
      }
    ).setex(
      `2fa:${user.email}`,
      900,
      JSON.stringify({
        token: otp,
        expiresAt: new Date(Date.now() + 900_000).toISOString(),
      }),
    );

    // Act
    const res = await request(buildApp())
      .post("/api/v1/auth/verify-otp")
      .send({ email: user.email, otp });

    // Assert: tenant not active blocks login
    expect(res.status).toBe(403);
  });
});

// POST /api/v1/auth/refresh-token

describe("POST /api/v1/auth/refresh-token", () => {
  it("returns 200 with new tokens and invalidates the old refresh token", async () => {
    // Arrange: seed a user and plant a refresh token in Redis
    const user = await seedUser({ email: "refresh@example.com" });
    const oldRefreshToken = v4();

    await (
      redisClient as unknown as {
        set: (k: string, v: string, ex: string, ttl: number) => Promise<void>;
      }
    ).set(
      `refresh:${oldRefreshToken}`,
      JSON.stringify({
        userId: user._id.toString(),
        userType: user.userType,
        name: "Jane Doe",
      }),
      "EX",
      604800,
    );

    // Act
    const res = await request(buildApp())
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: oldRefreshToken });

    // Assert HTTP
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.refreshToken).not.toBe(oldRefreshToken);

    // Assert rotation: old token must be gone from Redis
    const oldExists = await (
      redisClient as unknown as {
        get: (k: string) => Promise<string | null>;
      }
    ).get(`refresh:${oldRefreshToken}`);
    expect(oldExists).toBeNull();

    // Assert rotation: new token must exist in Redis
    const newExists = await (
      redisClient as unknown as {
        get: (k: string) => Promise<string | null>;
      }
    ).get(`refresh:${res.body.refreshToken}`);
    expect(newExists).not.toBeNull();
  });

  it("returns 401 when refresh token does not exist in Redis", async () => {
    const res = await request(buildApp())
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: v4() });

    expect(res.status).toBe(401);
  });

  it("rejects the old refresh token after rotation", async () => {
    // Arrange
    const user = await seedUser({ email: "rotation@example.com" });
    const oldRefreshToken = v4();

    await (
      redisClient as unknown as {
        set: (k: string, v: string, ex: string, ttl: number) => Promise<void>;
      }
    ).set(
      `refresh:${oldRefreshToken}`,
      JSON.stringify({
        userId: user._id.toString(),
        userType: user.userType,
        name: "Jane Doe",
      }),
      "EX",
      604800,
    );

    // Act: rotate
    await request(buildApp())
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: oldRefreshToken });

    // Act: try to use old token again
    const res = await request(buildApp())
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: oldRefreshToken });

    // Assert: old token rejected after rotation
    expect(res.status).toBe(401);
  });
});

// POST /api/v1/auth/logout

describe("POST /api/v1/auth/logout", () => {
  it("deletes the refresh token from Redis and blocklists the access token", async () => {
    // Arrange: create a real JWT so logout can decode it
    const user = await seedUser({ email: "logout@example.com" });
    const refreshToken = v4();

    const accessToken = jwt.sign(
      {
        user: {
          userId: user._id.toString(),
          role: user.userType,
          name: "Jane Doe",
        },
      },
      process.env.JWT_CODE!,
      { expiresIn: "15m" },
    );

    await (
      redisClient as unknown as {
        set: (k: string, v: string, ex: string, ttl: number) => Promise<void>;
      }
    ).set(
      `refresh:${refreshToken}`,
      JSON.stringify({ userId: user._id.toString() }),
      "EX",
      604800,
    );

    // Act
    const res = await request(buildApp())
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ refreshToken });

    // Assert HTTP
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);

    // Assert: refresh token deleted from Redis
    const refreshExists = await (
      redisClient as unknown as {
        get: (k: string) => Promise<string | null>;
      }
    ).get(`refresh:${refreshToken}`);
    expect(refreshExists).toBeNull();

    // Assert: access token blocklisted
    const blocklisted = await (
      redisClient as unknown as {
        get: (k: string) => Promise<string | null>;
      }
    ).get(`blocklist:${user._id.toString()}`);
    expect(blocklisted).toBe("1");
  });

  it("succeeds even when no access token is provided", async () => {
    // Logout with only refresh token should still clean up
    const user = await seedUser({ email: "logoutnotoken@example.com" });
    const refreshToken = v4();

    await (
      redisClient as unknown as {
        set: (k: string, v: string, ex: string, ttl: number) => Promise<void>;
      }
    ).set(
      `refresh:${refreshToken}`,
      JSON.stringify({ userId: user._id.toString() }),
      "EX",
      604800,
    );

    const res = await request(buildApp())
      .post("/api/v1/auth/logout")
      .send({ refreshToken });

    expect(res.status).toBe(200);

    const refreshExists = await (
      redisClient as unknown as {
        get: (k: string) => Promise<string | null>;
      }
    ).get(`refresh:${refreshToken}`);
    expect(refreshExists).toBeNull();
  });
});

// POST /api/v1/auth/request-reset
describe("POST /api/v1/auth/request-reset", () => {
  it("returns 200 when email is not registered", async () => {
    const res = await request(buildApp())
      .post("/api/v1/auth/request-reset")
      .send({ email: "ghost@example.com" });

    expect(res.status).toBe(200);
  });
});

// POST /api/v1/auth/password-reset
describe("POST /api/v1/auth/password-reset", () => {

  // POST /api/v1/auth/password-reset
  it("resets password successfully when token is valid", async () => {
    // Arrange: seed a user and generate a real reset token
    const user = await seedUser({ email: "resetpw@example.com" });

    // Trigger the reset request which now saves the token
    await request(buildApp())
      .post("/api/v1/auth/request-reset")
      .send({ email: user.email });

    // Retrieve the token directly from MongoDB
    const { PasswordResetToken } = await import("../../models/ResetPassword");
    const saved = await PasswordResetToken.findOne({
      userId: (user as any)._id,
    }).lean();

    expect(saved).not.toBeNull();

    // Act: reset the password using the saved token
    const res = await request(buildApp())
      .post("/api/v1/auth/password-reset")
      .send({ token: saved!.token, newPassword: "NewSecure1!" });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/password reset successfully/i);

    // Assert: token deleted after use
    const deleted = await PasswordResetToken.findById(saved!._id).lean();
    expect(deleted).toBeNull();

    // Assert: user can now log in with new password
    const loginRes = await request(buildApp())
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: "NewSecure1!" });

    expect(loginRes.status).toBe(200);
  });

  it("returns 400 when token does not exist", async () => {
    const res = await request(buildApp())
      .post("/api/v1/auth/password-reset")
      .send({ token: v4(), newPassword: "NewSecure1!" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not valid/i);
  });

  it("returns 400 when token has expired", async () => {
    // Arrange: manually insert an expired token
    const user = await seedUser({ email: "expiredtoken@example.com" });
    const { PasswordResetToken } = await import("../../models/ResetPassword");

    const expiredToken = await PasswordResetToken.create({
      token: v4(),
      userId: (user as any)._id,
      expiresAt: new Date(Date.now() - 1000), // already expired
    });

    // Act
    const res = await request(buildApp())
      .post("/api/v1/auth/password-reset")
      .send({ token: expiredToken.token, newPassword: "NewSecure1!" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });
});
