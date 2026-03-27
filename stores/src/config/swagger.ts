import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Stores Service",
      version: "1.0.0",
      description: "Multi-tenant store management. Each store is an isolated tenant.",
    },
    servers: [
      {
        url: process.env.NODE_ENV === "production"
          ? "https://api.selleasi.com/stores"
          : "http://localhost:8000/stores",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        Store: {
          type: "object",
          properties: {
            _id: { type: "string" },
            sellerId: { type: "string" },
            name: { type: "string", example: "Victor Fashion Store" },
            description: { type: "string" },
            domain: { type: "string", example: "victor-fashion" },
            logo: { type: "string" },
            isActive: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        CreateStoreRequest: {
          type: "object",
          required: ["name", "domain"],
          properties: {
            name: { type: "string", example: "Victor Fashion Store" },
            description: { type: "string" },
            domain: { type: "string", example: "victor-fashion" },
            logo: { type: "string" },
          },
        },
        UpdateStoreRequest: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            logo: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            error: { type: "string" },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: "Stores", description: "Store management" },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

export const storesSwaggerSpec = swaggerJsdoc(options);