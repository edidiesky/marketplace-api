import path from "path";
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Inventory MicroService",
      version: "1.0.0",
      description:
        "A three-field inventory accounting per product: onHand = available + reserved. " +
        "All stock changes basically use MongoDB $inc with a $gte guard inside a Redis distributed lock " +
        "to prevent oversell. Reserve and release are synchronous during checkout. " +
        "Commit is triggered by the ORDER_STOCK_COMMITTED Kafka event.",
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://api.selleasi.com/inventory"
            : "http://localhost:8000/inventory",
        description:
          process.env.NODE_ENV === "production"
            ? "Production – via API Gateway"
            : "Local dev – via API Gateway",
      },
    ],
    tags: [
      {
        name: "Inventory",
        description:
          "Seller-facing inventory management. Create and inspect inventory records per store.",
      },
      {
        name: "Inventory Internal",
        description:
          "Service-to-service endpoints called by the Orders service during the checkout saga. " +
          "Protected by x-internal-secret header. Never called directly by clients.",
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
        Inventory: {
          type: "object",
          properties: {
            _id: { type: "string", example: "664f1b2e8a1c2d3e4f5a6b7c" },
            productId: {
              type: "string",
              example: "692b1c07e389ba822fb50090",
              description: "MongoDB ObjectId of the product this record tracks.",
            },
            storeId: {
              type: "string",
              example: "692ae291a78a6f8c7ebbdd37",
              description: "MongoDB ObjectId of the store that owns this inventory.",
            },
            ownerId: { type: "string", example: "663e1a1d7b2c3d4e5f6a7b8c" },
            ownerName: { type: "string", example: "Chidi Okafor" },
            ownerEmail: {
              type: "string",
              format: "email",
              example: "chidi@selleasi.com",
            },
            warehouseId: {
              type: "string",
              example: "663e1a1d7b2c3d4e5f6a7b9a",
              description: "Optional warehouse ObjectId for multi-location tracking.",
            },
            warehouseName: { type: "string", example: "Lagos Central" },
            productTitle: { type: "string", example: "Nike Air Max 90 – Triple Black" },
            productImage: {
              type: "array",
              items: { type: "string" },
              example: [
                "https://res.cloudinary.com/selleasi/image/upload/v1/products/airmax-1.jpg",
              ],
            },
            storeName: { type: "string", example: "Chidi Sneakers" },
            storeDomain: { type: "string", example: "chidi-sneakers.selleasi.com" },
            quantityOnHand: {
              type: "number",
              example: 50,
              description: "Total physical units. Always equals available + reserved.",
            },
            quantityAvailable: {
              type: "number",
              example: 47,
              description: "Units that can be reserved by new orders.",
            },
            quantityReserved: {
              type: "number",
              example: 3,
              description: "Units held by in-flight orders pending payment confirmation.",
            },
            reorderPoint: {
              type: "number",
              example: 10,
              description: "Low-stock threshold. Notification triggered when quantityAvailable falls below this.",
            },
            reorderQuantity: {
              type: "number",
              example: 50,
              description: "Suggested replenishment quantity when reorder point is breached.",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateInventoryRequest: {
          type: "object",
          required: ["productId", "storeId", "quantityOnHand"],
          properties: {
            productId: { type: "string", example: "692b1c07e389ba822fb50090" },
            storeId: { type: "string", example: "692ae291a78a6f8c7ebbdd37" },
            productTitle: { type: "string", example: "Nike Air Max 90 – Triple Black" },
            productImage: {
              type: "array",
              items: { type: "string" },
            },
            quantityOnHand: { type: "number", example: 100 },
            reorderPoint: { type: "number", example: 10 },
            reorderQuantity: { type: "number", example: 50 },
            warehouseId: { type: "string" },
            warehouseName: { type: "string", example: "Lagos Central" },
            storeName: { type: "string" },
            storeDomain: { type: "string" },
          },
        },
        UpdateInventoryRequest: {
          type: "object",
          description:
            "All fields optional. Only supplied fields are patched. " +
            "quantityAvailable and quantityReserved cannot be set directly – " +
            "use the reserve/release/commit internal endpoints.",
          properties: {
            quantityOnHand: { type: "number", example: 120 },
            reorderPoint: { type: "number", example: 15 },
            reorderQuantity: { type: "number", example: 60 },
            warehouseName: { type: "string" },
          },
        },
        ReserveStockRequest: {
          type: "object",
          required: ["productId", "storeId", "quantity", "orderId"],
          properties: {
            productId: { type: "string", example: "692b1c07e389ba822fb50090" },
            storeId: { type: "string", example: "692ae291a78a6f8c7ebbdd37" },
            quantity: {
              type: "number",
              example: 2,
              description: "Units to move from available to reserved.",
            },
            orderId: {
              type: "string",
              example: "ord_01HXYZ",
              description: "Order ID used as the idempotency key for this reservation.",
            },
            userId: { type: "string", example: "663e1a1d7b2c3d4e5f6a7b8c" },
          },
        },
        ReleaseStockRequest: {
          type: "object",
          required: ["productId", "storeId", "quantity", "orderId"],
          properties: {
            productId: { type: "string", example: "692b1c07e389ba822fb50090" },
            storeId: { type: "string", example: "692ae291a78a6f8c7ebbdd37" },
            quantity: {
              type: "number",
              example: 2,
              description: "Units to move back from reserved to available.",
            },
            orderId: { type: "string", example: "ord_01HXYZ" },
            userId: { type: "string", example: "663e1a1d7b2c3d4e5f6a7b8c" },
          },
        },
        CommitStockRequest: {
          type: "object",
          required: ["productId", "storeId", "quantity", "orderId"],
          properties: {
            productId: { type: "string", example: "692b1c07e389ba822fb50090" },
            storeId: { type: "string", example: "692ae291a78a6f8c7ebbdd37" },
            quantity: {
              type: "number",
              example: 2,
              description:
                "Units to permanently deduct. Decrements both onHand and reserved. " +
                "Called after payment confirmation.",
            },
            orderId: { type: "string", example: "ord_01HXYZ" },
            userId: { type: "string", example: "663e1a1d7b2c3d4e5f6a7b8c" },
          },
        },
        InventoryAvailabilityResponse: {
          type: "object",
          properties: {
            productId: { type: "string" },
            quantityAvailable: { type: "number", example: 47 },
            isInStock: { type: "boolean", example: true },
          },
        },
        InventoryListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Inventory" },
            },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer", example: 1 },
                limit: { type: "integer", example: 20 },
                total: { type: "integer", example: 40 },
                totalPages: { type: "integer", example: 2 },
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            error: { type: "string", example: "Inventory record not found" },
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
                  field: { type: "string", example: "quantityOnHand" },
                  message: {
                    type: "string",
                    example: "quantityOnHand must be a positive number",
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

export const inventorySwaggerSpec = swaggerJsdoc(options);