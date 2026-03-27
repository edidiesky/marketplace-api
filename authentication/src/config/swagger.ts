import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Authentication Service",
      version: "1.0.0",
      description: "Handles user registration, login, OTP verification, and token management",
    },
    servers: [
      {
        url: process.env.NODE_ENV === "production"
          ? "https://api.selleasi.com/auth"
          : "http://localhost:8000/auth",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        RegisterRequest: {
          type: "object",
          required: ["fullName", "email", "password"],
          properties: {
            fullName: { type: "string", example: "Victor Essien" },
            email: { type: "string", format: "email", example: "victor@selleasi.com" },
            password: { type: "string", format: "password", example: "SecurePass123!" },
            phone: { type: "string", example: "+2348012345678" },
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
        OtpRequest: {
          type: "object",
          required: ["email", "otp"],
          properties: {
            email: { type: "string", format: "email", example: "victor@selleasi.com" },
            otp: { type: "string", example: "482910" },
          },
        },
        ResendOtpRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email", example: "victor@selleasi.com" },
          },
        },
        ForgotPasswordRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email", example: "victor@selleasi.com" },
          },
        },
        ResetPasswordRequest: {
          type: "object",
          required: ["token", "password"],
          properties: {
            token: { type: "string", example: "eyJhbGciOiJIUzI1NiJ9..." },
            password: { type: "string", format: "password", example: "NewSecurePass123!" },
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
                accessToken: { type: "string" },
                refreshToken: { type: "string" },
                user: {
                  type: "object",
                  properties: {
                    _id: { type: "string" },
                    fullName: { type: "string" },
                    email: { type: "string" },
                    isVerified: { type: "boolean" },
                    role: { type: "string", enum: ["buyer", "seller", "admin"] },
                  },
                },
              },
            },
          },
        },
        UserResponse: {
          type: "object",
          properties: {
            _id: { type: "string", example: "69a99d0a8f479c5b622a10c5" },
            fullName: { type: "string", example: "Victor Essien" },
            email: { type: "string", example: "victor@selleasi.com" },
            phone: { type: "string" },
            isVerified: { type: "boolean", example: true },
            role: { type: "string", enum: ["buyer", "seller", "admin"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            error: { type: "string", example: "Invalid credentials" },
          },
        },
      },
    },
    tags: [
      { name: "Auth", description: "Authentication and authorization" },
      { name: "Profile", description: "User profile management" },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

export const authSwaggerSpec = swaggerJsdoc(options);