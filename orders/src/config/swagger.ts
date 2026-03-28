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
        url:
          process.env.NODE_ENV === "production"
            ? "https://api.selleasi.com/orders"
            : "http://localhost:8000/orders",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
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
    paths: {
      "/api/v1/orders/{storeId}/checkout": {
        post: {
          tags: ["Checkout"],
          summary: "Create a new order from cart",
          description:
            "Fetches cart server-side, reserves inventory for each item atomically, and creates an order in PAYMENT_PENDING state. Idempotent via requestId.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "storeId",
              required: true,
              schema: { type: "string" },
              example: "692ae291a78a6f8c7ebbdd37",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["cartId", "requestId"],
                  properties: {
                    cartId: { type: "string", example: "69bdadb4c5979ae29c7519f3" },
                    requestId: {
                      type: "string",
                      format: "uuid",
                      example: "f1332326-ac69-4fc6-b8c4-53806e287866",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Order created successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Order" },
                },
              },
            },
            "400": {
              description: "Insufficient stock or cart empty",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "error" },
                      error: {
                        type: "string",
                        example: "One or more items are unavailable",
                      },
                      failedItems: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            productId: { type: "string" },
                            productTitle: { type: "string" },
                            reason: { type: "string", example: "Out of stock" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { description: "Unauthorized" },
            "503": {
              description: "Circuit breaker open",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "error" },
                      error: {
                        type: "string",
                        example: "Service orders is currently unavailable",
                      },
                      retryAfter: { type: "number", example: 30 },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/orders/{orderId}/shipping": {
        patch: {
          tags: ["Shipping"],
          summary: "Add or update shipping address on an order",
          description:
            "Only allowed when order is in PAYMENT_PENDING or PAYMENT_INITIATED state. Shipping is frozen once order reaches COMPLETED or FAILED.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "orderId",
              required: true,
              schema: { type: "string" },
              example: "69c572f77b95832e7af4cca2",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShippingAddress" },
              },
            },
          },
          responses: {
            "200": {
              description: "Shipping updated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Order" },
                },
              },
            },
            "400": {
              description: "Order not in a mutable state",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "403": { description: "Not the order owner" },
            "404": { description: "Order not found" },
          },
        },
      },
      "/api/v1/orders/{storeId}/store": {
        get: {
          tags: ["Orders"],
          summary: "Get all orders for a store",
          description: "Returns paginated orders for a given store. Seller-scoped.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "storeId",
              required: true,
              schema: { type: "string" },
              example: "692ae291a78a6f8c7ebbdd37",
            },
            {
              in: "query",
              name: "page",
              schema: { type: "integer", default: 1 },
            },
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", default: 10 },
            },
            {
              in: "query",
              name: "orderStatus",
              schema: {
                type: "string",
                enum: [
                  "payment_pending",
                  "payment_initiated",
                  "completed",
                  "failed",
                  "out_of_stock",
                ],
              },
            },
          ],
          responses: {
            "200": {
              description: "Paginated orders",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PaginatedOrders" },
                },
              },
            },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/v1/orders/detail/{id}": {
        get: {
          tags: ["Orders"],
          summary: "Get a single order by ID",
          description:
            "Returns full order details including cart items, shipping, and receipt URL.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: { type: "string" },
              example: "69c572f77b95832e7af4cca2",
            },
          ],
          responses: {
            "200": {
              description: "Order found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Order" },
                },
              },
            },
            "404": {
              description: "Order not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/v1/orders/{orderId}/fulfillment": {
        patch: {
          tags: ["Fulfillment"],
          summary: "Update fulfillment status",
          description:
            "Seller-only. Valid transitions: unfulfilled -> preparing -> dispatched -> delivered. Order must be in COMPLETED payment status.",
          security: [{ BearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "orderId",
              required: true,
              schema: { type: "string" },
              example: "69c572f77b95832e7af4cca2",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: {
                    status: {
                      type: "string",
                      enum: [
                        "preparing",
                        "dispatched",
                        "delivered",
                        "delivery_failed",
                      ],
                      example: "dispatched",
                    },
                    trackingNumber: {
                      type: "string",
                      example: "GIG123456789NG",
                    },
                    courierName: {
                      type: "string",
                      example: "GIG Logistics",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Fulfillment status updated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Order" },
                },
              },
            },
            "400": {
              description: "Invalid transition or order not completed",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "403": { description: "Not the order seller" },
            "404": { description: "Order not found" },
          },
        },
      },
    },
  },
  apis: [],
};

export const ordersSwaggerSpec = swaggerJsdoc(options);