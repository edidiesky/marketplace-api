import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';

export function setupSwagger(app: Express) {
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Product Service API',
        version: '1.0.0',
        description: 'API documentation for Product Service',
      },
    },
    apis: ['./src/routes/*.ts'], // Adjust as needed
  };
  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
