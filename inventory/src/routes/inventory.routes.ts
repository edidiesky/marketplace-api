import express from "express";
import {
  CreateInventoryHandler,
  GetAllStoreInventoryHandler,
  GetSingleStoreInventoryHandler,
  UpdateInventoryHandler,
  DeleteInventoryHandler,
} from "../controllers/inventory.controller";
import {
  authenticate,
} from "../middleware/auth.middleware";
import { inventorySchema } from "../validators/inventory.validation";
import { validateRequest } from "../middleware/validate.middleware";
const router = express.Router();

router
  .route("")
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
export default router;
