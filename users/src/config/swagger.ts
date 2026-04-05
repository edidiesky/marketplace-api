import path from "path";
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Selleasi – Users and Roles Service",
      version: "1.0.0",
      description:
        "Platform user management and role-based access control. " +
        "All routes require a valid JWT. tenantId is always scoped from the JWT. " +
        "User list supports partial name search, enum filters, and boolean filters. " +
        "Role assignments take effect on the next login for the affected user.",
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://api.selleasi.com/users"
            : "http://localhost:8000/users",
        description:
          process.env.NODE_ENV === "production"
            ? "Production – via API Gateway"
            : "Local dev – via API Gateway",
      },
    ],
    tags: [
      {
        name: "Users",
        description:
          "Platform user management. Supports paginated listing with filters, " +
          "single user fetch, partial profile update with __v optimistic concurrency, " +
          "hard delete (SUPER_ADMIN only), and aggregated analytics.",
      },
      {
        name: "Roles",
        description:
          "Role and permission management. MANAGE_ROLES permission required for most operations. " +
          "Roles are scoped to the tenant from the JWT.",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Access token issued by the Auth service. " +
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
        Permission: {
          type: "string",
          enum: [
            "MANAGE_ROLES", "READ_USER", "UPDATE_USER", "DELETE_USER", "VIEW_REPORTS",
            "PLATFORM_ADMIN", "MANAGE_TENANTS", "TENANT_OWNER", "MANAGE_TEAM",
            "STORE_CREATE", "STORE_UPDATE", "STORE_DELETE", "STORE_SETTINGS",
            "PRODUCT_CREATE", "PRODUCT_UPDATE", "PRODUCT_DELETE", "PRODUCT_VIEW",
            "INVENTORY_MANAGE", "INVENTORY_VIEW",
            "ORDER_VIEW", "ORDER_FULFILL", "ORDER_REFUND",
            "ANALYTICS_VIEW", "FINANCIAL_VIEW",
            "CUSTOMER_BROWSE", "CUSTOMER_PURCHASE", "CUSTOMER_REVIEW",
          ],
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
            nationality: { type: "string", example: "Nigerian" },
            isEmailVerified: { type: "boolean", example: true },
            isArchived: { type: "boolean", example: false },
            falseIdentificationFlag: { type: "boolean", example: false },
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
        UpdateUserRequest: {
          type: "object",
          description:
            "All fields optional. At least one must be provided. " +
            "Immutable fields (email, tenantId, tenantType, tenantStatus, tenantPlan, passwordHash) " +
            "are stripped server-side regardless of what is sent.",
          properties: {
            firstName: { type: "string", example: "Victor" },
            lastName: { type: "string", example: "Essien" },
            phone: { type: "string", example: "+2348012345678" },
            address: { type: "string", example: "14 Lagos Street, Victoria Island" },
            profileImage: { type: "string", format: "uri" },
            gender: { type: "string", enum: ["Male", "Female"] },
            nationality: { type: "string", example: "Nigerian" },
          },
        },
        CreateRoleRequest: {
          type: "object",
          required: ["name", "permissions"],
          properties: {
            name: { type: "string", example: "Store Manager" },
            description: { type: "string", example: "Can manage products and orders." },
            permissions: {
              type: "array",
              items: { $ref: "#/components/schemas/Permission" },
              example: ["PRODUCT_CREATE", "PRODUCT_UPDATE", "ORDER_VIEW"],
            },
          },
        },
        AssignRoleRequest: {
          type: "object",
          required: ["userId", "roleId"],
          properties: {
            userId: { type: "string", example: "663e1a1d7b2c3d4e5f6a7b8c" },
            roleId: { type: "string", example: "664f1b2e8a1c2d3e4f5a6b7c" },
          },
        },
        UpdateRoleRequest: {
          type: "object",
          description: "All fields optional. Changes take effect on the next login.",
          properties: {
            name: { type: "string", example: "Senior Store Manager" },
            description: { type: "string" },
            permissions: {
              type: "array",
              items: { $ref: "#/components/schemas/Permission" },
            },
          },
        },
        RoleResponse: {
          type: "object",
          properties: {
            _id: { type: "string", example: "664f1b2e8a1c2d3e4f5a6b7c" },
            name: { type: "string", example: "Store Manager" },
            description: { type: "string" },
            permissions: {
              type: "array",
              items: { $ref: "#/components/schemas/Permission" },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            error: { type: "string", example: "User not found" },
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
                  field: { type: "string", example: "phone" },
                  message: {
                    type: "string",
                    example: "Phone must be a valid number with an optional country code",
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
  apis: [path.join(__dirname, "../routes/*.js")],
};

export const usersSwaggerSpec = swaggerJsdoc(options);