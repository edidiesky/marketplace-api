import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { GetStoreCustomersHandler } from "./customer.controller";

const router = Router();

router.get(
  "/:storeId/customers",
  authenticate,
  GetStoreCustomersHandler
);

export default router;