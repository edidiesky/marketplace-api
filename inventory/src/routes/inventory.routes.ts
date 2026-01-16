import express from "express";
import {
  CreateInventoryHandler,
  GetAllStoreInventoryHandler,
  GetSingleStoreInventoryHandler,
  UpdateInventoryHandler,
  DeleteInventoryHandler,
  CheckInventoryAvailabilityHandler,
} from "../controllers/inventory.controller";
import {
  authenticate,
} from "../middleware/auth.middleware";
import { inventorySchema } from "../validators/inventory.validation";
import { validateRequest } from "../middleware/validate.middleware";
const router = express.Router();

router
  .route("/:storeId/store")
  .post(
    authenticate,
    validateRequest(inventorySchema),
    CreateInventoryHandler
  )
  .get(authenticate, GetAllStoreInventoryHandler);

router
  .route("/:id")
  .get(authenticate, GetSingleStoreInventoryHandler)
  .put(authenticate, UpdateInventoryHandler)
  .delete(authenticate, DeleteInventoryHandler);

router.get("/check/:productId", CheckInventoryAvailabilityHandler);
export default router;


