import { Router } from "express";
import { validateRequest } from "../../middleware/validate.middleware";
import { authenticate }    from "../../middleware/auth.middleware";
import {
  createProductSchema,
  updateProductSchema,
} from "./product.validator";
import {
  CreateProductHandler,
  GetStoreProductsHandler,
  GetProductByIdHandler,
  UpdateProductHandler,
  DeleteProductHandler,
  RestoreProductHandler,
} from "./product.controller";

const router = Router();

router
  .route("/:storeId/store")
  .post(
    authenticate,
    validateRequest(createProductSchema),
    CreateProductHandler
  )
  .get(authenticate, GetStoreProductsHandler);

router
  .route("/:productId")
  .get(GetProductByIdHandler)
  .patch(authenticate, validateRequest(updateProductSchema), UpdateProductHandler)
  .delete(authenticate, DeleteProductHandler);

router.post(
  "/:productId/restore",
  authenticate,
  RestoreProductHandler
);

export default router;