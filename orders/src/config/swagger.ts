import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Orders Service",
      version: "1.0.0",
      description: "Handles checkout, order lifecycle, fulfillment, and shipping",
    },
    servers: [
      {
        url: process.env.NODE_ENV === "production"
          ? "https://api.selleasi.com/orders"
          : "http://localhost:8000/orders",
        description: process.env.NODE_ENV === "production" ? "Production" : "Development",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        CartItem: {
          type: "object",
          properties: {
            productId: { type: "string", example: "692b1c07e389ba822fb50090" },
            productTitle: { type: "string", example: "Nike Air Max 90" },
            productDescription: { type: "string" },
            productPrice: { type: "number", example: 45000 },
            productQuantity: { type: "number", example: 2 },
            productImage: {
              type: "array",
              items: { type: "string" },
              example: ["https://res.cloudinary.com/example/image.jpg"],
            },
          },
        },
        ShippingAddress: {
          type: "object",
          required: ["street", "city", "state", "country"],
          properties: {
            street: { type: "string", example: "12 Aba Road" },
            city: { type: "string", example: "Port Harcourt" },
            state: { type: "string", example: "Rivers" },
            country: { type: "string", example: "Nigeria" },
            postalCode: { type: "string", example: "500001" },
          },
        },
        Order: {
          type: "object",
          properties: {
            _id: { type: "string", example: "69c572f77b95832e7af4cca2" },
            userId: { type: "string" },
            sellerId: { type: "string" },
            storeId: { type: "string" },
            cartId: { type: "string" },
            fullName: { type: "string", example: "Victor Essien" },
            quantity: { type: "number", example: 3 },
            totalPrice: { type: "number", example: 135000 },
            cartItems: {
              type: "array",
              items: { $ref: "#/components/schemas/CartItem" },
            },
            orderStatus: {
              type: "string",
              enum: [
                "payment_pending",
                "payment_initiated",
                "completed",
                "failed",
                "out_of_stock",
              ],
              example: "payment_pending",
            },
            fulfillmentStatus: {
              type: "string",
              enum: [
                "unfulfilled",
                "preparing",
                "dispatched",
                "delivered",
                "delivery_failed",
              ],
              example: "unfulfilled",
            },
            shipping: { $ref: "#/components/schemas/ShippingAddress" },
            transactionId: { type: "string" },
            receiptUrl: { type: "string" },
            sagaId: { type: "string" },
            requestId: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            error: { type: "string", example: "Order not found" },
          },
        },
        PaginatedOrders: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                orders: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Order" },
                },
                totalCount: { type: "number", example: 42 },
                totalPages: { type: "number", example: 5 },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: "Checkout", description: "Checkout and order creation" },
      { name: "Orders", description: "Order retrieval and management" },
      { name: "Shipping", description: "Shipping address management" },
      { name: "Fulfillment", description: "Seller fulfillment operations" },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

export const ordersSwaggerSpec = swaggerJsdoc(options);