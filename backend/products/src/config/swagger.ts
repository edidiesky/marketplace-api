import path from "path";
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Selleasi – Products Service",
      version: "1.0.0",
      description:
        "Manages the product catalog for each store tenant. Products are scoped by storeId and tenantId derived from the JWT. All writes go through a transactional outbox so inventory and Elasticsearch stay consistent without dual-write risk.",
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://api.selleasi.com/products"
            : "http://localhost:8000/products",
        description:
          process.env.NODE_ENV === "production"
            ? "Production – via API Gateway"
            : "Local dev – via API Gateway",
      },
    ],
    tags: [
      {
        name: "Product Catalog",
        description:
          "Create, read, update, soft-delete and restore products within a store are being handled here. All mutations emit an outbox event that keeps inventory and the ES search index in sync.",
      },
      {
        name: "Product Search",
        description:
          "Elasticsearch-backed full-text search and autocomplete. ES is a read replica only and MongoDB is basically the source of truth.",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Access token issued by the Auth service. Payload carries tenantId, storeId, role and permissions. Token lifetime is 15 minutes.",
        },
      },
      schemas: {
        ProductColor: {
          type: "object",
          required: ["name", "value"],
          properties: {
            name: { type: "string", example: "Midnight Black" },
            value: { type: "string", example: "#0a0a0a" },
          },
        },
        ProductSize: {
          type: "object",
          required: ["name", "value"],
          properties: {
            name: { type: "string", example: "UK Size" },
            value: { type: "string", example: "42" },
          },
        },
        Product: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "664f1b2e8a1c2d3e4f5a6b7c",
            },
            ownerId: {
              type: "string",
              example: "663e1a1d7b2c3d4e5f6a7b8c",
              description: "MongoDB ObjectId of the seller who owns this product.",
            },
            ownerName: { type: "string", example: "Chidi Okafor" },
            ownerImage: {
              type: "string",
              example: "https://res.cloudinary.com/selleasi/image/upload/v1/sellers/chidi.jpg",
            },
            store: {
              type: "string",
              example: "663e1a1d7b2c3d4e5f6a7b8d",
              description: "MongoDB ObjectId of the store this product belongs to.",
            },
            storeName: { type: "string", example: "Chidi Sneakers" },
            storeDomain: { type: "string", example: "chidi-sneakers.selleasi.com" },
            tenantId: { type: "string", example: "tenant_01HXYZ" },
            name: {
              type: "string",
              example: "Nike Air Max 90 – Triple Black",
              description: "Unique product name within the platform.",
            },
            description: {
              type: "string",
              maxLength: 500,
              example: "Classic Air Max silhouette in an all-black colourway. Full-length Air unit.",
            },
            price: {
              type: "number",
              minimum: 0,
              example: 45000,
              description: "Price in the store's base currency (Naira).",
            },
            category: {
              type: "array",
              items: { type: "string" },
              example: ["Footwear", "Sneakers"],
            },
            colors: {
              type: "array",
              items: { $ref: "#/components/schemas/ProductColor" },
            },
            size: {
              type: "array",
              items: { $ref: "#/components/schemas/ProductSize" },
            },
            images: {
              type: "array",
              items: { type: "string" },
              example: [
                "https://res.cloudinary.com/selleasi/image/upload/v1/products/airmax-1.jpg",
              ],
            },
            availableStock: {
              type: "number",
              example: 80,
              description: "Current units available for purchase. Managed by the Inventory service.",
            },
            thresholdStock: {
              type: "number",
              example: 10,
              description: "Low-stock alert threshold. Notification is triggered when availableStock falls below this value.",
            },
            trackInventory: {
              type: "boolean",
              example: true,
              description: "When false the product is treated as unlimited stock.",
            },
            sku: {
              type: "string",
              example: "NK-AM90-BLK-42",
              description: "Stock-keeping unit. Unique per variant.",
            },
            isArchive: {
              type: "boolean",
              example: false,
              description: "Archived products are hidden from the storefront but not deleted.",
            },
            isDeleted: {
              type: "boolean",
              example: false,
              description: "Soft-delete flag. Deleted products are excluded from all queries and the ES index.",
            },
            deletedBy: {
              type: "string",
              example: "663e1a1d7b2c3d4e5f6a7b8c",
              description: "ObjectId of the user who performed the soft-delete.",
            },
            deletedAt: {
              type: "string",
              format: "date-time",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateProductRequest: {
          type: "object",
          required: ["name", "price", "category", "colors", "size"],
          properties: {
            name: {
              type: "string",
              example: "Nike Air Max 90 – Triple Black",
            },
            description: {
              type: "string",
              maxLength: 500,
              example: "Classic Air Max silhouette in an all-black colourway.",
            },
            price: { type: "number", minimum: 0, example: 45000 },
            category: {
              type: "array",
              items: { type: "string" },
              example: ["Footwear", "Sneakers"],
            },
            colors: {
              type: "array",
              items: { $ref: "#/components/schemas/ProductColor" },
            },
            size: {
              type: "array",
              items: { $ref: "#/components/schemas/ProductSize" },
            },
            images: {
              type: "array",
              items: { type: "string" },
              example: [
                "https://res.cloudinary.com/selleasi/image/upload/v1/products/airmax-1.jpg",
              ],
            },
            availableStock: { type: "number", example: 100 },
            thresholdStock: { type: "number", example: 10 },
            trackInventory: { type: "boolean", example: true },
            sku: { type: "string", example: "NK-AM90-BLK-42" },
            storeDomain: {
              type: "string",
              example: "chidi-sneakers.selleasi.com",
            },
          },
        },
        UpdateProductRequest: {
          type: "object",
          description:
            "All fields are optional. Only supplied fields are patched. Triggers a PRODUCT_UPDATED outbox event which syncs the ES document.",
          properties: {
            name: { type: "string", example: "Nike Air Max 90 – White" },
            description: { type: "string" },
            price: { type: "number", minimum: 0, example: 48000 },
            category: {
              type: "array",
              items: { type: "string" },
            },
            colors: {
              type: "array",
              items: { $ref: "#/components/schemas/ProductColor" },
            },
            size: {
              type: "array",
              items: { $ref: "#/components/schemas/ProductSize" },
            },
            images: { type: "array", items: { type: "string" } },
            trackInventory: { type: "boolean" },
            thresholdStock: { type: "number" },
            isArchive: { type: "boolean" },
            storeDomain: { type: "string" },
          },
        },
        ProductListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Product" },
            },
            pagination: {
              type: "object",
              properties: {
                page: { type: "integer", example: 1 },
                limit: { type: "integer", example: 20 },
                total: { type: "integer", example: 84 },
                totalPages: { type: "integer", example: 5 },
              },
            },
          },
        },
        SearchResult: {
          type: "object",
          description: "ES search hit mapped back to the product shape.",
          properties: {
            _id: { type: "string", example: "664f1b2e8a1c2d3e4f5a6b7c" },
            name: { type: "string", example: "Nike Air Max 90 – Triple Black" },
            price: { type: "number", example: 45000 },
            storeName: { type: "string", example: "Chidi Sneakers" },
            storeId: { type: "string", example: "663e1a1d7b2c3d4e5f6a7b8d" },
            category: {
              type: "array",
              items: { type: "string" },
            },
            images: { type: "array", items: { type: "string" } },
            score: {
              type: "number",
              example: 4.72,
              description: "Elasticsearch relevance score. Present only when a query string was supplied.",
            },
          },
        },
        AutocompleteResult: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  _id: { type: "string" },
                  name: { type: "string", example: "Nike Air Max" },
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            error: { type: "string", example: "Product not found" },
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
                  field: { type: "string", example: "price" },
                  message: { type: "string", example: "price must be a positive number" },
                },
              },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: [path.join(__dirname, "../routes/*.js")]
};

export const productsSwaggerSpec = swaggerJsdoc(options);