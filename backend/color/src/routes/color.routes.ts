import express from "express";
import {
  CreateColorHandler,
  GetAllStoreColorHandler,
  GetSingleStoreColorHandler,
  UpdateColorHandler,
  DeleteColorHandler,
} from "../controllers/color.controller";
import {
  authenticate,
} from "../middleware/auth.middleware";
import { colorSchema } from "../validators/color.validation";
import { validateRequest } from "../middleware/validate.middleware";
const router = express.Router();

router
  .route("/store/:storeid")
  .post(
    authenticate,
    validateRequest(colorSchema),
    CreateColorHandler
  )
  .get(authenticate, GetAllStoreColorHandler);

router
  .route("/:id")
  .get(authenticate, GetSingleStoreColorHandler)
  .put(authenticate, UpdateColorHandler)
  .delete(authenticate, DeleteColorHandler);
export default router;
