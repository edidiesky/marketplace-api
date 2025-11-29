import express from "express";
import {
  CreateProductHandler,
  GetAllStoreProductHandler,
  GetSingleStoreProductHandler,
  UpdateProductHandler,
  DeleteProductHandler,
} from "../controllers/product.controller";
import { authenticate } from "../middleware/auth.middleware";
import { productSchema } from "../validators/product.validation";
import { validateRequest } from "../middleware/validate.middleware";
const router = express.Router();

router
  .route("/:storeid/store")
  .post(authenticate, validateRequest(productSchema), CreateProductHandler)
  .get(authenticate, GetAllStoreProductHandler);

router
  .route("/:id")
  .get(authenticate, GetSingleStoreProductHandler)
  .put(authenticate, UpdateProductHandler)
  .delete(authenticate, DeleteProductHandler);
export default router;
