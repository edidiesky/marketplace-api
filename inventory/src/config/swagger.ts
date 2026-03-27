import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Inventory Service",
      version: "1.0.0",
      description: "Three-field inventory accounting: onHand = available + reserved",
    },
    servers: [
      {
        url: process.env.NODE_ENV === "production"
          ? "https://api.selleasi.com/inventory"
          : "http://localhost:8000/inventory",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        Inventory: {
          type: "object",
          properties: {
            _id: { type: "string" },
            productId: { type: "string", example: "692b1c07e389ba822fb50090" },
            storeId: { type: "string", example: "692ae291a78a6f8c7ebbdd37" },
            ownerId: { type: "string" },
            productTitle: { type: "string", example: "Nike Air Max 90" },
            quantityOnHand: { type: "number", example: 50 },
            quantityAvailable: { type: "number", example: 47 },
            quantityReserved: { type: "number", example: 3 },
            reorderPoint: { type: "number", example: 10 },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        CreateInventoryRequest: {
          type: "object",
          required: ["productId", "storeId", "quantityOnHand"],
          properties: {
            productId: { type: "string" },
            storeId: { type: "string" },
            productTitle: { type: "string" },
            quantityOnHand: { type: "number", example: 100 },
            reorderPoint: { type: "number", example: 10 },
          },
        },
        UpdateInventoryRequest: {
          type: "object",
          properties: {
            quantityOnHand: { type: "number" },
            reorderPoint: { type: "number" },
          },
        },
        ReserveRequest: {
          type: "object",
          required: ["productId", "storeId", "quantity", "sagaId", "userId"],
          properties: {
            productId: { type: "string" },
            storeId: { type: "string" },
            quantity: { type: "number", example: 2 },
            sagaId: { type: "string" },
            userId: { type: "string" },
          },
        },
        ReleaseRequest: {
          type: "object",
          required: ["productId", "storeId", "quantity", "sagaId", "userId"],
          properties: {
            productId: { type: "string" },
            storeId: { type: "string" },
            quantity: { type: "number" },
            sagaId: { type: "string" },
            userId: { type: "string" },
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
      { name: "Inventory", description: "Inventory management" },
      { name: "Internal", description: "Internal service-to-service endpoints" },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

export const inventorySwaggerSpec = swaggerJsdoc(options);