import express from "express";
import {
  CreateCategoryHandler,
  GetAllStoreCategoryHandler,
  GetSingleStoreCategoryHandler,
  UpdateCategoryHandler,
  DeleteCategoryHandler,
} from "../controllers/category.controller";
import {
  authenticate,
} from "../middleware/auth.middleware";
import { categorySchema } from "../validators/category.validation";
import { validateRequest } from "../middleware/validate.middleware";
const router = express.Router();

router
  .route("/store/:storeid")
  .post(
    authenticate,
    validateRequest(categorySchema),
    CreateCategoryHandler
  )
  .get(authenticate, GetAllStoreCategoryHandler);

router
  .route("/:id")
  .get(authenticate, GetSingleStoreCategoryHandler)
  .put(authenticate, UpdateCategoryHandler)
  .delete(authenticate, DeleteCategoryHandler);
export default router;
