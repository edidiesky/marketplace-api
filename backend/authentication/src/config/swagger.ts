import path from "path";
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Selleasi – Auth Service",
      version: "1.0.0",
      description:
        "Identity and access management. Multi-step onboarding " +
        "(email verify -> confirm token -> set password -> signup), " +
        "2FA OTP on login, hybrid JWT pattern " +
        "(15 min stateless access token + 7 day stateful refresh token + Redis blocklist on logout). " +
        "JWT payload carries userId, role, tenantId, tenantType, tenantPlan, permissions, roleLevel. " +
        "tenantId is injected from JWT on every downstream service — never trusted from the request body.",
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://api.selleasi.com/auth"
            : "http://localhost:8000/auth",
        description:
          process.env.NODE_ENV === "production"
            ? "Production – via API Gateway"
            : "Local dev – via API Gateway",
      },
    ],
    tags: [
      {
        name: "Onboarding",
        description:
          "Multi-step registration flow: verify email -> confirm token -> set password -> signup. " +
          "Each step must be completed in order before the next is available.",
      },
      {
        name: "Session",
        description:
          "Login, 2FA OTP verification, token refresh, and logout. " +
          "Login triggers a 2FA OTP sent via email or SMS with a 15 min Redis TTL. " +
          "Access tokens are 15 min stateless JWTs. Refresh tokens are 7 day stateful nanoid(32) stored in Redis.",
      },
      {
        name: "Password",
        description:
          "Password reset and password change. Reset uses a signed token with a short TTL.",
      },
      {
        name: "Profile",
        description: "Authenticated user profile read and update.",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Access token issued by this service on successful 2FA verification. " +
            "Lifetime: 15 minutes. Payload: { userId, role, tenantId, tenantType, tenantPlan, permissions, roleLevel }.",
        },
      },
      schemas: {
        UserType: {
          type: "string",
          enum: ["SELLERS", "ADMIN", "INVESTORS", "CUSTOMER"],
          example: "SELLERS",
        },
        TenantType: {
          type: "string",
          enum: [
            "SELLER_INDIVIDUAL", "SELLER_BUSINESS", "MARKETPLACE", "FRANCHISE",
            "ADMIN_PLATFORM", "ADMIN_PARTNER", "CUSTOMER_B2C", "CUSTOMER_B2B",
            "INVESTOR_ANGEL", "INVESTOR_VC", "ADVISOR", "SYSTEM_INTERNAL", "DEMO", "TEST",
          ],
          example: "SELLER_INDIVIDUAL",
        },
        TenantStatus: {
          type: "string",
          enum: ["DRAFT", "ACTIVE", "SUSPENDED", "DELETED"],
          example: "ACTIVE",
        },
        BillingPlan: {
          type: "string",
          enum: ["FREE", "PRO", "ENTERPRISE"],
          example: "FREE",
        },
        VerifyEmailRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email", example: "victor@selleasi.com" },
          },
        },
        PasswordOnboardingRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "victor@selleasi.com" },
            password: { type: "string", format: "password", example: "SecurePass123!" },
          },
        },
        FinalSignupRequest: {
          type: "object",
          required: ["email", "firstName", "lastName", "phone", "userType"],
          properties: {
            email: { type: "string", format: "email", example: "victor@selleasi.com" },
            firstName: { type: "string", example: "Victor" },
            lastName: { type: "string", example: "Essien" },
            phone: { type: "string", example: "+2348012345678" },
            userType: { $ref: "#/components/schemas/UserType" },
            gender: { type: "string", enum: ["Male", "Female"], example: "Male" },
            address: { type: "string", example: "14 Lagos Street, Victoria Island" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "victor@selleasi.com" },
            password: { type: "string", format: "password", example: "SecurePass123!" },
          },
        },
        Verify2FARequest: {
          type: "object",
          required: ["email", "otp"],
          properties: {
            email: { type: "string", format: "email", example: "victor@selleasi.com" },
            otp: {
              type: "string",
              example: "482910",
              description: "6-digit OTP. TTL: 15 minutes in Redis.",
            },
          },
        },
        RequestPasswordResetRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email", example: "victor@selleasi.com" },
          },
        },
        PasswordResetRequest: {
          type: "object",
          required: ["token", "password"],
          properties: {
            token: { type: "string", example: "eyJhbGciOiJIUzI1NiJ9..." },
            password: { type: "string", format: "password", example: "NewSecurePass123!" },
          },
        },
        ChangePasswordRequest: {
          type: "object",
          required: ["currentPassword", "newPassword"],
          properties: {
            currentPassword: { type: "string", format: "password" },
            newPassword: { type: "string", format: "password", example: "NewSecurePass123!" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Login successful" },
            data: {
              type: "object",
              properties: {
                accessToken: {
                  type: "string",
                  description: "Stateless JWT. Lifetime: 15 minutes.",
                },
                user: { $ref: "#/components/schemas/UserResponse" },
              },
            },
          },
        },
        UserResponse: {
          type: "object",
          properties: {
            _id: { type: "string", example: "663e1a1d7b2c3d4e5f6a7b8c" },
            firstName: { type: "string", example: "Victor" },
            lastName: { type: "string", example: "Essien" },
            email: { type: "string", example: "victor@selleasi.com" },
            phone: { type: "string", example: "+2348012345678" },
            userType: { $ref: "#/components/schemas/UserType" },
            profileImage: { type: "string" },
            address: { type: "string" },
            gender: { type: "string", enum: ["Male", "Female"] },
            isEmailVerified: { type: "boolean", example: true },
            tenantId: { type: "string", example: "tenant_01HXYZ" },
            tenantType: { $ref: "#/components/schemas/TenantType" },
            tenantStatus: { $ref: "#/components/schemas/TenantStatus" },
            tenantPlan: { $ref: "#/components/schemas/BillingPlan" },
            trialEndsAt: { type: "string", format: "date-time" },
            currentPeriodEndsAt: { type: "string", format: "date-time" },
            cancelAtPeriodEnd: { type: "boolean", example: false },
            lastActiveAt: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            error: { type: "string", example: "Invalid credentials" },
          },
        },
        ValidationErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string", example: "email" },
                  message: {
                    type: "string",
                    example: "email must be a valid email address",
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  // Scoped to auth.routes.js only — user and role routes have their own spec
  apis: [path.join(__dirname, "../routes/auth.routes.js")],
};

export const authSwaggerSpec = swaggerJsdoc(options);