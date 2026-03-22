import express from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import {
  CheckoutHandler,
  AddShippingHandler,
  GetUserOrdersHandler,
  GetOrderHandler,
  UpdateFulfillmentHandler,
} from "../controllers/order.controller";
import { CheckoutSchema, FulfillmentSchema, ShippingSchema } from "../validators/order.validation";
import { authenticateOrInternal } from "../middleware/internal";

const router = express.Router();

/**
 * @description route to handle checkout
 * @route POST /orders/:storeId/checkout
 * @access PRIVATE
 */
router.post(
  "/:storeId/checkout",
  authenticate,
  validateRequest(CheckoutSchema),
  CheckoutHandler
);

/**
 * @description route to handle shipping
 * @route PATCH /orders/:orderId/shipping
 * @access PRIVATE
 */
router.patch(
  "/:orderId/shipping",
  authenticate,
  validateRequest(ShippingSchema),
  AddShippingHandler
);

/**
 * @description route to handle all order for a store
 * @route GET /orders/:storeId/store
 * @access PRIVATE
 */
router.get("/:storeId/store", authenticate, GetUserOrdersHandler);


/**
 * @description route to handle all order for a store
 * @route GET /orders/detail/:id
 * @access PRIVATE
 */
router.get("/detail/:id", authenticateOrInternal, GetOrderHandler);

/**
 * @description route to handle order delivery (basically updates the fulfillment state)
 * @route PATCH /orders/:orderId/fulfillment
 * @access PRIVATE (admin exclusively)
 */
router.patch(
  "/:orderId/fulfillment",
  authenticate,
  validateRequest(FulfillmentSchema),
  UpdateFulfillmentHandler
);

export default router;