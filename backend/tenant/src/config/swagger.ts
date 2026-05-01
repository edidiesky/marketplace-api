import path from "path";
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Selleasi – Tenant Service",
      version: "1.0.0",
      description:
        "Tenant provisioning and lifecycle management. A tenant is created automatically " +
        "via the Kafka saga triggered by USER_ONBOARDING_COMPLETED_TOPIC. " +
        "On success emits TENANT_ONBOARDING_COMPLETED_TOPIC which patches the user record with tenantId. " +
        "On failure emits TENANT_CREATION_FAILED_TOPIC which triggers USER_ROLLBACK_TOPIC to delete the user. " +
        "Billing plan changes automatically adjust quota limits via the pre-save hook.",
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://api.selleasi.com/tenant"
            : "http://localhost:8000/tenant",
        description:
          process.env.NODE_ENV === "production"
            ? "Production – via API Gateway"
            : "Local dev – via API Gateway",
      },
    ],
    tags: [
      {
        name: "Tenants",
        description:
          "Tenant provisioning and management. Each tenant maps to one seller account. " +
          "tenantId is the cross-service correlation key injected into every JWT.",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Access token issued by the Auth service. 15-minute lifetime.",
        },
      },
      schemas: {
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
          description:
            "DRAFT: saga in-flight. ACTIVE: fully provisioned. " +
            "SUSPENDED: billing issue. DELETED: soft-deleted.",
        },
        BillingPlan: {
          type: "string",
          enum: ["FREE", "PRO", "ENTERPRISE"],
          example: "FREE",
        },
        TenantLimits: {
          type: "object",
          description:
            "Quota limits automatically set by the billingPlan pre-save hook. " +
            "FREE: 1 store / 100 products / 1 member / 1k API calls. " +
            "PRO: 5 / 1k / 10 / 50k. ENTERPRISE: unlimited.",
          properties: {
            stores: { type: "number", example: 1 },
            products: { type: "number", example: 100 },
            teamMembers: { type: "number", example: 1 },
            apiCallsPerMonth: { type: "number", example: 1000 },
          },
        },
        Tenant: {
          type: "object",
          properties: {
            _id: { type: "string", example: "664f1b2e8a1c2d3e4f5a6b7c" },
            tenantId: {
              type: "string",
              example: "tenant_6b7c8d",
              description: "Platform-scoped tenant identifier injected into JWTs.",
            },
            ownerId: {
              type: "string",
              example: "663e1a1d7b2c3d4e5f6a7b8c",
              description: "MongoDB ObjectId of the user who owns this tenant.",
            },
            ownerEmail: { type: "string", format: "email", example: "victor@selleasi.com" },
            ownerName: { type: "string", example: "Victor Essien" },
            type: { $ref: "#/components/schemas/TenantType" },
            status: { $ref: "#/components/schemas/TenantStatus" },
            billingPlan: { $ref: "#/components/schemas/BillingPlan" },
            trialEndsAt: {
              type: "string",
              format: "date-time",
              description: "Set to 7 days from creation for FREE plan tenants.",
            },
            currentPeriodEndsAt: { type: "string", format: "date-time" },
            cancelAtPeriodEnd: { type: "boolean", example: false },
            limits: { $ref: "#/components/schemas/TenantLimits" },
            metadata: {
              type: "object",
              additionalProperties: true,
              description: "Arbitrary key-value store for tenant-specific configuration.",
            },
            isTrialActive: {
              type: "boolean",
              example: true,
              description: "Virtual field. True if current time is before trialEndsAt.",
            },
            isActive: {
              type: "boolean",
              example: true,
              description: "Virtual field. True if status is ACTIVE.",
            },
            deletedAt: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateTenantRequest: {
          type: "object",
          required: ["ownerId", "ownerEmail", "type"],
          description:
            "In normal flow this is called by the Kafka consumer, not directly by a client. " +
            "This endpoint exists for admin provisioning and backfill.",
          properties: {
            ownerId: { type: "string", example: "663e1a1d7b2c3d4e5f6a7b8c" },
            ownerEmail: { type: "string", format: "email", example: "victor@selleasi.com" },
            ownerName: { type: "string", example: "Victor Essien" },
            type: { $ref: "#/components/schemas/TenantType" },
            billingPlan: { $ref: "#/components/schemas/BillingPlan" },
            metadata: { type: "object", additionalProperties: true },
          },
        },
        UpdateTenantRequest: {
          type: "object",
          description:
            "All fields optional. Only supplied fields are patched. " +
            "Changing billingPlan triggers the pre-save hook which resets limits automatically.",
          properties: {
            ownerName: { type: "string" },
            status: { $ref: "#/components/schemas/TenantStatus" },
            billingPlan: { $ref: "#/components/schemas/BillingPlan" },
            cancelAtPeriodEnd: { type: "boolean" },
            currentPeriodEndsAt: { type: "string", format: "date-time" },
            metadata: { type: "object", additionalProperties: true },
          },
        },
        TenantListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Tenant" },
            },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer", example: 1 },
                limit: { type: "integer", example: 20 },
                total: { type: "integer", example: 200 },
                totalPages: { type: "integer", example: 10 },
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            error: { type: "string", example: "Tenant not found" },
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
                  field: { type: "string", example: "type" },
                  message: { type: "string", example: "type must be a valid TenantType" },
                },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: [path.join(__dirname, "../routes/*.js")],
};

export const tenantSwaggerSpec = swaggerJsdoc(options);