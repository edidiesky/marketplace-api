import path from "path";
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Selleasi – Stores Service",
      version: "1.0.0",
      description:
        "Multi-tenant store management. Each store is an isolated tenant boundary " +
        "for products, orders, inventory, and payments. " +
        "storeId and tenantId are always derived from the JWT — never trusted from the request body. " +
        "TenantScopedRepository enforces tenantId at the repository layer on every query.",
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://api.selleasi.com/stores"
            : "http://localhost:8000/stores",
        description:
          process.env.NODE_ENV === "production"
            ? "Production – via API Gateway"
            : "Local dev – via API Gateway",
      },
    ],
    tags: [
      {
        name: "Stores",
        description:
          "Store CRUD operations. A store is the top-level tenant unit. " +
          "Each seller owns exactly one store. All downstream resources " +
          "(products, inventory, orders) are scoped to a storeId.",
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
        StoreAddress: {
          type: "object",
          required: ["street", "city", "state", "country", "postalCode"],
          properties: {
            street: { type: "string", example: "14 Bode Thomas Street" },
            city: { type: "string", example: "Lagos" },
            state: { type: "string", example: "Lagos State" },
            country: { type: "string", example: "Nigeria" },
            postalCode: { type: "string", example: "100001" },
          },
        },
        StoreShippingMethod: {
          type: "object",
          properties: {
            name: { type: "string", example: "Standard Delivery" },
            rate: { type: "number", example: 1500 },
            estimatedDays: { type: "number", example: 3 },
          },
        },
        StoreSettings: {
          type: "object",
          properties: {
            currency: {
              type: "string",
              example: "NGN",
              description: "ISO 4217 currency code. Defaults to NGN.",
            },
            timezone: {
              type: "string",
              example: "Africa/Lagos",
              description: "IANA timezone identifier.",
            },
            taxRate: {
              type: "number",
              minimum: 0,
              maximum: 100,
              example: 7.5,
              description: "VAT or sales tax percentage applied at checkout.",
            },
            shippingMethods: {
              type: "array",
              items: { $ref: "#/components/schemas/StoreShippingMethod" },
            },
            paymentMethods: {
              type: "array",
              items: { type: "string" },
              example: ["paystack", "flutterwave"],
            },
          },
        },
        StoreSubscription: {
          type: "object",
          properties: {
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            status: {
              type: "string",
              enum: ["active", "expired", "cancelled"],
              example: "active",
            },
          },
        },
        StoreStats: {
          type: "object",
          properties: {
            totalOrders: { type: "number", example: 142 },
            totalRevenue: { type: "number", example: 4850000 },
            totalProducts: { type: "number", example: 38 },
          },
        },
        Store: {
          type: "object",
          properties: {
            _id: { type: "string", example: "692ae291a78a6f8c7ebbdd37" },
            ownerId: {
              type: "string",
              example: "663e1a1d7b2c3d4e5f6a7b8c",
              description: "MongoDB ObjectId of the seller who owns this store.",
            },
            ownerName: { type: "string", example: "Victor Essien" },
            ownerEmail: {
              type: "string",
              format: "email",
              example: "victor@selleasi.com",
            },
            name: { type: "string", example: "Victor Fashion Store" },
            slug: {
              type: "string",
              example: "victor-fashion-store",
              description: "URL-safe lowercase identifier. Unique across the platform.",
            },
            description: {
              type: "string",
              maxLength: 1000,
              example: "Premium Nigerian fashion for the modern professional.",
            },
            logo: {
              type: "string",
              example: "https://res.cloudinary.com/selleasi/image/upload/v1/stores/logo.jpg",
            },
            banner: {
              type: "string",
              example: "https://res.cloudinary.com/selleasi/image/upload/v1/stores/banner.jpg",
            },
            domain: {
              type: "string",
              example: "victorfashion.com",
              description: "Custom domain if configured. Unique, sparse index.",
            },
            subdomain: {
              type: "string",
              example: "victor-fashion",
              description:
                "Platform subdomain (victor-fashion.selleasi.com). " +
                "Unique across the platform. Lowercase.",
            },
            email: {
              type: "string",
              format: "email",
              example: "store@victorfashion.com",
              description: "Store contact email. Used for order notifications.",
            },
            phoneNumber: { type: "string", example: "+2348012345678" },
            address: { $ref: "#/components/schemas/StoreAddress" },
            settings: { $ref: "#/components/schemas/StoreSettings" },
            isActive: {
              type: "boolean",
              example: true,
              description: "Inactive stores are hidden from the marketplace.",
            },
            isPremium: { type: "boolean", example: false },
            plan: {
              type: "string",
              enum: ["free", "basic", "premium", "enterprise"],
              example: "free",
            },
            subscription: { $ref: "#/components/schemas/StoreSubscription" },
            stats: { $ref: "#/components/schemas/StoreStats" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateStoreRequest: {
          type: "object",
          required: ["name", "subdomain", "email", "address"],
          properties: {
            name: { type: "string", example: "Victor Fashion Store" },
            subdomain: {
              type: "string",
              example: "victor-fashion",
              description:
                "Must be unique across the platform. Lowercase. " +
                "Used to generate the store URL: {subdomain}.selleasi.com.",
            },
            email: {
              type: "string",
              format: "email",
              example: "store@victorfashion.com",
            },
            description: { type: "string", maxLength: 1000 },
            logo: { type: "string" },
            banner: { type: "string" },
            domain: {
              type: "string",
              example: "victorfashion.com",
              description: "Optional custom domain.",
            },
            phoneNumber: { type: "string", example: "+2348012345678" },
            address: { $ref: "#/components/schemas/StoreAddress" },
            settings: { $ref: "#/components/schemas/StoreSettings" },
          },
        },
        UpdateStoreRequest: {
          type: "object",
          description:
            "All fields optional. Only supplied fields are patched. " +
            "subdomain and ownerId cannot be changed after creation.",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            logo: { type: "string" },
            banner: { type: "string" },
            domain: { type: "string" },
            email: { type: "string", format: "email" },
            phoneNumber: { type: "string" },
            address: { $ref: "#/components/schemas/StoreAddress" },
            settings: { $ref: "#/components/schemas/StoreSettings" },
            isActive: { type: "boolean" },
          },
        },
        StoreListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Store" },
            },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer", example: 1 },
                limit: { type: "integer", example: 20 },
                total: { type: "integer", example: 54 },
                totalPages: { type: "integer", example: 3 },
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            error: { type: "string", example: "Store not found" },
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
                  field: { type: "string", example: "subdomain" },
                  message: {
                    type: "string",
                    example: "subdomain must be a lowercase alphanumeric string",
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

export const storesSwaggerSpec = swaggerJsdoc(options);