import express from "express";
import {
  CreateNotificationHandler,
  UpdateNotificationHandler,
  DeleteNotificationHandler,
  CartReminderHandler,
  LowStockAlertHandler,
} from "../controllers/notification.controller";
import { authenticate } from "../middleware/auth.middleware";
import { internalOnly } from "../middleware/internal.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import { cartReminderSchema, lowStockAlertSchema } from "@/validators/notification.validation";

const router = express.Router();

router.post(
  "/internal/notifications/cart-reminder",
  internalOnly,
  validateRequest(cartReminderSchema),
  CartReminderHandler
);

router.post(
  "/internal/notifications/low-stock",
  internalOnly,
  validateRequest(lowStockAlertSchema),
  LowStockAlertHandler
);

router
  .route("/:storeid")
  .post(
    authenticate,
    // validateRequest(notificationSchema),
    CreateNotificationHandler
  );

router
  .route("/:id")
  .put(authenticate, UpdateNotificationHandler)
  .delete(authenticate, DeleteNotificationHandler);

export default router;