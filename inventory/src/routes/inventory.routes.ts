import express from "express";
import {
  CreateInventoryHandler,
  GetAllStoreInventoryHandler,
  GetSingleStoreInventoryHandler,
  UpdateInventoryHandler,
  DeleteInventoryHandler,
  CheckInventoryAvailabilityHandler,
  // FIX #1: Import new handlers
  ReserveStockHandler,
  ReleaseStockHandler,
  CommitStockHandler,
} from "../controllers/inventory.controller";
import { authenticate } from "../middleware/auth.middleware";
import { inventorySchema } from "../validators/inventory.validation";
import { validateRequest } from "../middleware/validate.middleware";
const router = express.Router();

router.post("/reserve", ReserveStockHandler);
router.post("/release", ReleaseStockHandler);
router.post("/commit", CommitStockHandler);
router.get("/check/:productId", CheckInventoryAvailabilityHandler);
router
  .route("/:storeId/store")
  .post(authenticate, validateRequest(inventorySchema), CreateInventoryHandler)
  .get(authenticate, GetAllStoreInventoryHandler);
router
  .route("/:id")
  .get(authenticate, GetSingleStoreInventoryHandler)
  .put(authenticate, UpdateInventoryHandler)
  .delete(authenticate, DeleteInventoryHandler);

export default router;
