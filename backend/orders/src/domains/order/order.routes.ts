import { Router } from "express";
import { validateRequest } from "../../middleware/validate.middleware";
import { authenticate }    from "../../middleware/auth.middleware";
import { internalOnly }    from "../../middleware/internal.middleware";
import {
  checkoutSchema,
  shippingSchema,
  fulfillmentSchema,
  abandonOrderSchema,
} from "./order.validator";
import {
  CheckoutHandler,
  AddShippingHandler,
  GetOrderHandler,
  GetStoreOrdersHandler,
  GetUserOrdersHandler,
  UpdateFulfillmentHandler,
  AbandonOrderHandler,
} from "./order.controller";

const router = Router();

router.post(
  "/:storeId/checkout",
  authenticate,
  validateRequest(checkoutSchema),
  CheckoutHandler
);

router.patch(
  "/:orderId/shipping",
  authenticate,
  validateRequest(shippingSchema),
  AddShippingHandler
);

router.get(
  "/:storeId/store",
  authenticate,
  GetStoreOrdersHandler
);

router.get(
  "/me",
  authenticate,
  GetUserOrdersHandler
);

router.get(
  "/detail/:id",
  GetOrderHandler
);

router.patch(
  "/:orderId/fulfillment",
  authenticate,
  validateRequest(fulfillmentSchema),
  UpdateFulfillmentHandler
);

router.post(
  "/internal/:orderId/abandon",
  internalOnly,
  validateRequest(abandonOrderSchema),
  AbandonOrderHandler
);

export default router;