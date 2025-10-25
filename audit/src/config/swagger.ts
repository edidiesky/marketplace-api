import swaggerJsdoc from "swagger-jsdoc";
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AKIRS-BACKEND API Documentation",
      version: "1.0.0",
      description: "API documentation for AKIRS-BACKEND Test",
    },
    servers: [
      {
        url: "https://AKIRS-BACKEND-test-backend.onrender.com",
        description: "Production server",
      },
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
};
export const specs = swaggerJsdoc(options);
