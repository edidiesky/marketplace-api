import path from "path";
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Cart Service",
      version: "1.0.0",
      description:
        "Manages shopping cart state per store per user. Each cart is scoped to " +
        "a (userId, storeId) pair enforced by a unique index. All write operations " +
        "acquire a Redis distributed lock to prevent concurrent modification. " +
        "Cart TTL is controlled by the expireAt field with a MongoDB TTL index. " +
        "Cart clearout is triggered by the ORDER_STOCK_COMMITTED Kafka event, not ORDER_COMPLETED.",
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://api.selleasi.com/cart"
            : "http://localhost:8000/cart",
        description:
          process.env.NODE_ENV === "production"
            ? "Production via API Gateway"
            : "Local dev via API Gateway",
      },
    ],
    tags: [
      {
        name: "Cart",
        description:
          "Cart CRUD operations. Buyer-facing endpoints for adding, viewing and updating cart items.",
      },
      {
        name: "Cart Admin",
        description:
          "Seller and admin endpoints for inspecting all carts in a store.",
      },
      {
        name: "Cart Internal",
        description:
          "Service-to-service endpoints. Protected by x-internal-secret. " +
          "Called by the Orders service during checkout to fetch cart contents.",
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
        CartItemStatus: {
          type: "string",
          enum: ["available", "out_of_stock", "price_changed", "discontinued"],
          example: "available",
          description:
            "Availability state of a cart item. Set to out_of_stock by the " +
            "CART_ITEM_OUT_OF_STOCK Kafka event when inventory reservation fails.",
        },
        CartItem: {
          type: "object",
          required: [
            "productId",
            "productTitle",
            "productPrice",
            "productQuantity",
            "productImage",
          ],
          properties: {
            productId: {
              type: "string",
              example: "692b1c07e389ba822fb50090",
              description: "MongoDB ObjectId of the product.",
            },
            productTitle: { type: "string", example: "Nike Air Max 90 Triple Black" },
            productDescription: { type: "string", example: "Classic Air Max silhouette." },
            productPrice: {
              type: "number",
              example: 45000,
              description: "Price at the time the item was added to the cart.",
            },
            productQuantity: {
              type: "number",
              minimum: 1,
              example: 2,
              description: "Number of units the buyer wants to purchase.",
            },
            productImage: {
              type: "array",
              items: { type: "string" },
              example: [
                "https://res.cloudinary.com/selleasi/image/upload/v1/products/airmax-1.jpg",
              ],
            },
            reservedAt: {
              type: "string",
              format: "date-time",
              description: "Timestamp when inventory was reserved for this item during checkout.",
            },
            availabilityStatus: {
              $ref: "#/components/schemas/CartItemStatus",
            },
            unavailabilityReason: {
              type: "string",
              example: "Only 1 unit remaining in stock",
              description: "Human-readable reason populated when availabilityStatus is not available.",
            },
          },
        },
        Cart: {
          type: "object",
          properties: {
            _id: { type: "string", example: "664f1b2e8a1c2d3e4f5a6b7c" },
            userId: {
              type: "string",
              example: "663e1a1d7b2c3d4e5f6a7b8c",
              description: "Buyer who owns this cart.",
            },
            storeId: {
              type: "string",
              example: "692ae291a78a6f8c7ebbdd37",
              description: "Store this cart belongs to. Each buyer has at most one cart per store.",
            },
            sellerId: {
              type: "string",
              example: "69c56f0aea6147bab7dc78bb",
              description: "Seller who owns the store.",
            },
            fullName: {
              type: "string",
              example: "Victor Essien",
              description: "Buyer display name at the time of cart creation.",
            },
            quantity: {
              type: "number",
              example: 3,
              description: "Total number of units across all cart items.",
            },
            totalPrice: {
              type: "number",
              example: 90000,
              description: "Sum of productPrice * productQuantity across all cart items.",
            },
            cartItems: {
              type: "array",
              items: { $ref: "#/components/schemas/CartItem" },
            },
            expireAt: {
              type: "string",
              format: "date-time",
              description:
                "TTL expiry timestamp. MongoDB deletes the document when this time passes " +
                "via a TTL index (expireAfterSeconds: 0).",
            },
            version: {
              type: "number",
              example: 3,
              description:
                "Monotonically incrementing write counter. Used for optimistic concurrency detection.",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        AddToCartRequest: {
          type: "object",
          required: ["sellerId", "fullName", "cartItems", "totalPrice", "quantity", "expireAt"],
          properties: {
            sellerId: { type: "string", example: "69c56f0aea6147bab7dc78bb" },
            fullName: {
              type: "string",
              example: "Victor Essien",
              description: "Buyer display name.",
            },
            totalPrice: { type: "number", example: 90000 },
            quantity: {
              type: "number",
              example: 3,
              description: "Total units across all items in this request.",
            },
            expireAt: {
              type: "string",
              format: "date-time",
              example: "2025-01-15T12:00:00.000Z",
              description: "When the cart should expire. Typically 7 days from now.",
            },
            cartItems: {
              type: "array",
              items: { $ref: "#/components/schemas/CartItem" },
            },
          },
        },
        UpdateCartItemRequest: {
          type: "object",
          required: ["productId", "productQuantity"],
          properties: {
            productId: {
              type: "string",
              example: "692b1c07e389ba822fb50090",
              description: "Product whose quantity should be updated.",
            },
            productQuantity: {
              type: "number",
              minimum: 1,
              example: 4,
              description: "New quantity. Must be at least 1. To remove use the delete endpoint.",
            },
          },
        },
        CartListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Cart" },
            },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer", example: 1 },
                limit: { type: "integer", example: 20 },
                total: { type: "integer", example: 15 },
                totalPages: { type: "integer", example: 1 },
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            error: { type: "string", example: "Cart not found" },
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
                  field: { type: "string", example: "cartItems" },
                  message: {
                    type: "string",
                    example: "cartItems must be a non-empty array",
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

export const cartSwaggerSpec = swaggerJsdoc(options);