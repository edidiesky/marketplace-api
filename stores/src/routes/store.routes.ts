import express from "express";
import {
  CreateStoreHandler,
  GetAllStoreHandler,
  GetSingleStoreStoreHandler,
  UpdateStoreHandler,
  DeleteStoreHandler,
} from "../controllers/store.controller";
import { authenticate } from "../middleware/auth.middleware";
import { createStoreSchema } from "../validators/store.validation";
import { validateRequest } from "../middleware/validate.middleware";
const router = express.Router();

router
  .route("")
  .post(authenticate, validateRequest(createStoreSchema), CreateStoreHandler)
  .get(authenticate, GetAllStoreHandler);

router
  .route("/:id")
  .get(authenticate, GetSingleStoreStoreHandler)
  .put(authenticate, UpdateStoreHandler)
  .delete(authenticate, DeleteStoreHandler);
export default router;
