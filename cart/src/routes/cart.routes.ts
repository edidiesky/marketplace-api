import express from "express";
import {
  CreateCartHandler,
  GetUserCartHandler,
  GetAllStoreCartHandler,
  GetSingleStoreCartHandler,
  UpdateCartHandler,
  DeleteCartItemHandler,
} from "../controllers/cart.controller";
import { authenticate } from "../middleware/auth.middleware";
import {
  addToCartSchema,
  updateCartItemSchema,
} from "../validators/cart.validation";
import { validateRequest } from "../middleware/validate.middleware";
const router = express.Router();

router
  .route("/:storeId/store")
  .post(authenticate, validateRequest(addToCartSchema), CreateCartHandler)
  .get(authenticate, GetUserCartHandler);

router.route("/:storeId/admin/carts").get(authenticate, GetAllStoreCartHandler);

router
  .route("/:id")
  .get(authenticate, GetSingleStoreCartHandler)
  .put(authenticate, validateRequest(updateCartItemSchema), UpdateCartHandler)
  .delete(authenticate, DeleteCartItemHandler);
export default router;
