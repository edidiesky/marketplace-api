import swaggerJSDoc from "swagger-jsdoc";

const swaggerDefinition = {
  openapi: "3.0.3",
  info: {
    title: "SellEazy Payment API",
    version: "1.0.0",
    description:
      "API documentation for the Payment microservice. Handles payment initialization, history, webhooks, and refunds.",
    contact: {
      name: "Your Name",
      email: "dev@yourcompany.com",
    },
  },
  servers: [
    {
      url: "http://localhost:5000/api/payments",
      description: "Local Development Server",
    },
    {
      url: "https://api.yourproduction.com/api/payments",
      description: "Production Server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token (from /auth/login)",
      },
    },
    schemas: {
      InitializePaymentRequest: {
        type: "object",
        required: ["orderId", "gateway", "customerEmail", "customerName", "amount"],
        properties: {
          orderId: { type: "string", example: "67a8b9c0d1e2f3g4h5i6j7k8" },
          gateway: {
            type: "string",
            enum: ["paystack", "flutterwave"],
            example: "paystack",
          },
          customerEmail: { type: "string", format: "email", example: "john@example.com" },
          customerName: { type: "string", example: "John Doe" },
          amount: { type: "number", example: 50000.00 },
          phone: { type: "string", example: "+2348012345678" },
          currency: { type: "string", example: "NGN", default: "NGN" },
          metadata: { type: "object" },
        },
      },
      PaymentResponse: {
        type: "object",
        properties: {
          paymentId: { type: "string" },
          redirectUrl: { type: "string", format: "url" },
        },
      },
      RefundRequest: {
        type: "object",
        properties: {
          amount: { type: "number", example: 30000.00 },
          reason: { type: "string", example: "Customer changed mind" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: { type: "string" },
        },
      },
    },
  },
  tags: [
    {
      name: "Payments",
      description: "Payment operations",
    },
    {
      name: "Webhooks",
      description: "Gateway callbacks (public)",
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: [
    "./src/routes/payment.routes.ts",           // For route-level comments
    "./src/controllers/payment.controller.ts", // For handler-level comments
  ],
};

export const swaggerSpec = swaggerJSDoc(options);