import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Cart Service",
      version: "1.0.0",
      description: "Manages shopping cart state per store per user",
    },
    servers: [
      {
        url: process.env.NODE_ENV === "production"
          ? "https://api.selleasi.com/cart"
          : "http://localhost:8000/cart",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        CartItem: {
          type: "object",
          required: ["productId", "productTitle", "productPrice", "productQuantity"],
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
        AddToCartRequest: {
          type: "object",
          required: ["sellerId", "fullName", "cartItems"],
          properties: {
            sellerId: { type: "string", example: "69c56f0aea6147bab7dc78bb" },
            fullName: { type: "string", example: "Victor Essien" },
            cartItems: {
              type: "array",
              items: { $ref: "#/components/schemas/CartItem" },
            },
          },
        },
        Cart: {
          type: "object",
          properties: {
            _id: { type: "string" },
            userId: { type: "string" },
            storeId: { type: "string" },
            sellerId: { type: "string" },
            fullName: { type: "string" },
            quantity: { type: "number" },
            totalPrice: { type: "number" },
            cartItems: {
              type: "array",
              items: { $ref: "#/components/schemas/CartItem" },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
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
      { name: "Cart", description: "Cart CRUD operations" },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

export const cartSwaggerSpec = swaggerJsdoc(options);