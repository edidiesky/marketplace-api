import express, { Application, Request, Response, NextFunction } from "express";
import authRouter from "../../../routes/auth.routes";

export function buildApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/auth", authRouter);

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
