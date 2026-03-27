import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Products Service",
      version: "1.0.0",
      description: "Product catalog management per store",
    },
    servers: [
      {
        url: process.env.NODE_ENV === "production"
          ? "https://api.selleasi.com/products"
          : "http://localhost:8000/products",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        Product: {
          type: "object",
          properties: {
            _id: { type: "string" },
            storeId: { type: "string" },
            sellerId: { type: "string" },
            title: { type: "string", example: "Nike Air Max 90" },
            description: { type: "string" },
            price: { type: "number", example: 45000 },
            category: { type: "string", example: "Footwear" },
            images: {
              type: "array",
              items: { type: "string" },
            },
            isAvailable: { type: "boolean", example: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        CreateProductRequest: {
          type: "object",
          required: ["title", "price", "storeId"],
          properties: {
            title: { type: "string", example: "Nike Air Max 90" },
            description: { type: "string" },
            price: { type: "number", example: 45000 },
            category: { type: "string", example: "Footwear" },
            images: { type: "array", items: { type: "string" } },
            availableStock: { type: "number", example: 100 },
            thresholdStock: { type: "number", example: 10 },
          },
        },
        UpdateProductRequest: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            price: { type: "number" },
            category: { type: "string" },
            images: { type: "array", items: { type: "string" } },
            isAvailable: { type: "boolean" },
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
      { name: "Products", description: "Product catalog operations" },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

export const productsSwaggerSpec = swaggerJsdoc(options);