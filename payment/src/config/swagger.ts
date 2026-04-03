import swaggerJsdoc from "swagger-jsdoc";
import path from 'path'
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Payment Service",
      version: "1.0.0",
      description: "Payment initialization, webhook processing, wallet, ledger, and payouts",
    },
    servers: [
      {
        url: process.env.NODE_ENV === "production"
          ? "https://api.selleasi.com/payment"
          : "http://localhost:8000/payment",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        InitializePaymentRequest: {
          type: "object",
          required: ["orderId", "gateway", "customerEmail", "customerName", "amount"],
          properties: {
            orderId: { type: "string", example: "69c572f77b95832e7af4cca2" },
            gateway: {
              type: "string",
              enum: ["paystack", "flutterwave"],
              example: "paystack",
            },
            customerEmail: { type: "string", format: "email", example: "victor@selleasi.com" },
            customerName: { type: "string", example: "Victor Essien" },
            amount: { type: "number", example: 135000 },
            phone: { type: "string", example: "+2348012345678" },
            currency: { type: "string", default: "NGN", example: "NGN" },
            metadata: { type: "object" },
          },
        },
        PaymentResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Payment initialized successfully" },
            data: {
              type: "object",
              properties: {
                paymentId: { type: "string", example: "pay_1774547780909_lf0keoqrv" },
                redirectUrl: {
                  type: "string",
                  example: "https://checkout.paystack.com/access_code_here",
                },
              },
            },
          },
        },
        Payment: {
          type: "object",
          properties: {
            _id: { type: "string" },
            paymentId: { type: "string" },
            orderId: { type: "string" },
            customerId: { type: "string" },
            amount: { type: "number" },
            currency: { type: "string" },
            status: {
              type: "string",
              enum: ["pending", "success", "failed", "refunded"],
            },
            gateway: { type: "string", enum: ["paystack", "flutterwave"] },
            customerEmail: { type: "string" },
            paidAt: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        RefundRequest: {
          type: "object",
          properties: {
            amount: { type: "number", example: 45000 },
            reason: { type: "string", example: "Customer requested refund" },
          },
        },
        Wallet: {
          type: "object",
          properties: {
            _id: { type: "string" },
            sellerId: { type: "string" },
            storeId: { type: "string" },
            balance: { type: "number", example: 1370.85 },
            currency: { type: "string", example: "NGN" },
          },
        },
        PayoutRequest: {
          type: "object",
          required: ["amount", "bankCode", "accountNumber"],
          properties: {
            amount: { type: "number", example: 50000 },
            bankCode: { type: "string", example: "044" },
            accountNumber: { type: "string", example: "0123456789" },
            accountName: { type: "string", example: "Victor Essien" },
            reason: { type: "string", example: "Weekly payout" },
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
      { name: "Payments", description: "Payment initialization and history" },
      { name: "Webhooks", description: "PSP webhook callbacks" },
      { name: "Wallet", description: "Seller wallet and balance" },
      { name: "Payouts", description: "Seller payout requests" },
    ],
  },
  apis: [path.join(__dirname, "../routes/*.js")]
};

export const paymentSwaggerSpec = swaggerJsdoc(options);