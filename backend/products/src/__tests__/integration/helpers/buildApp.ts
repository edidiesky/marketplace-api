import express, { Application, NextFunction, Request, Response } from "express";
import productRoute from "../../../routes/product.routes";

export default function buildApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/products", productRoute);

  // middlware for caching errors
  app.use(
    (
      err: Error & { statusCode?: number },
      req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      let message = err instanceof Error ? err.message : String(err);
      let statusCode = err?.statusCode ?? 500;
      res.status(err?.statusCode ?? 500).json({
        message,
      });
    },
  );
  return app;
}
