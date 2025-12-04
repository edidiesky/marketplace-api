import express from "express";
import {
  CreateCartHandler,
  GetAllStoreCartHandler,
  GetSingleStoreCartHandler,
  UpdateCartHandler,
  DeleteCartHandler,
} from "../controllers/cart.controller";
import {
  authenticate,
} from "../middleware/auth.middleware";
import { addToCartSchema } from "../validators/cart.validation";
import { validateRequest } from "../middleware/validate.middleware";
const router = express.Router();

router
  .route("/")
  .post(
    authenticate,
    validateRequest(addToCartSchema),
    CreateCartHandler
  )
  .get(authenticate, GetAllStoreCartHandler);

router
  .route("/:id")
  .get(authenticate, GetSingleStoreCartHandler)
  .put(authenticate, UpdateCartHandler)
  .delete(authenticate, DeleteCartHandler);
export default router;
