import { Router } from "express";
import { validateRequest } from "../../middleware/validate.middleware";
import { authenticate }    from "../../middleware/auth.middleware";
import { internalOnly }    from "../../middleware/internal";
import {
  addToCartSchema,
  updateCartItemSchema,
  deleteCartItemSchema,
} from "./cart.validator";
import {
  AddToCartHandler,
  GetUserCartHandler,
  GetAllStoreCartsHandler,
  GetCartByIdHandler,
  UpdateCartItemHandler,
  DeleteCartItemHandler,
} from "./cart.controller";

const router = Router();

router.get(
  "/internal/:cartId",
  internalOnly,
  GetCartByIdHandler
);

router
  .route("/:storeId/store")
  .post(
    authenticate,
    validateRequest(addToCartSchema),
    AddToCartHandler
  )
  .get(authenticate, GetUserCartHandler);

router.get(
  "/:storeId/admin/carts",
  authenticate,
  GetAllStoreCartsHandler
);

router.patch(
  "/:storeId/items",
  authenticate,
  validateRequest(updateCartItemSchema),
  UpdateCartItemHandler
);

router.delete(
  "/:storeId/items",
  authenticate,
  validateRequest(deleteCartItemSchema),
  DeleteCartItemHandler
);

router.get(
  "/:cartId",
  authenticate,
  GetCartByIdHandler
);

export default router;