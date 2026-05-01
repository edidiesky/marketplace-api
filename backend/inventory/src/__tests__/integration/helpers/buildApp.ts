import express, {
  Application,
  Request,
  Response,
  NextFunction,
} from "express";
import inventoryRouter from "../../../routes/inventory.routes";

export function buildApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/inventories", inventoryRouter);

  app.use(
    (
      err: Error & { statusCode?: number },
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      const status =
        err.statusCode ?? (res.statusCode !== 200 ? res.statusCode : 500);
      res.status(status).json({
        success: false,
        error: err.message,
      });
    },
  );

  return app;
}