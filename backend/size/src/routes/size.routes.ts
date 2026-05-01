import express from "express";
import {
  CreateSizeHandler,
  GetAllStoreSizeHandler,
  GetSingleStoreSizeHandler,
  UpdateSizeHandler,
  DeleteSizeHandler,
} from "../controllers/size.controller";
import { authenticate } from "../middleware/auth.middleware";
import { sizeSchema } from "../validators/size.validation";
import { validateRequest } from "../middleware/validate.middleware";
const router = express.Router();

router
  .route("/store/:storeid")
  .post(authenticate, validateRequest(sizeSchema), CreateSizeHandler)
  .get(authenticate, GetAllStoreSizeHandler);

router
  .route("/:id")
  .get(authenticate, GetSingleStoreSizeHandler)
  .put(authenticate, UpdateSizeHandler)
  .delete(authenticate, DeleteSizeHandler);
export default router;
