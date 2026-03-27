import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Notification Service",
      version: "1.0.0",
      description: "In-app notifications and email delivery",
    },
    servers: [
      {
        url: process.env.NODE_ENV === "production"
          ? "https://api.selleasi.com/notification"
          : "http://localhost:8000/notification",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        Notification: {
          type: "object",
          properties: {
            _id: { type: "string" },
            userId: { type: "string" },
            title: { type: "string", example: "Order Confirmed" },
            message: { type: "string", example: "Your order #ABC123 has been confirmed." },
            type: {
              type: "string",
              enum: ["order", "payment", "delivery", "system"],
              example: "order",
            },
            isRead: { type: "boolean", example: false },
            metadata: { type: "object" },
            createdAt: { type: "string", format: "date-time" },
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
      { name: "Notifications", description: "In-app notification management" },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

export const notificationSwaggerSpec = swaggerJsdoc(options);