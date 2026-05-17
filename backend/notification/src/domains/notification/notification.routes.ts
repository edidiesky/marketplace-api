import { Router } from "express";
import { validateRequest } from "../../middleware/validate.middleware";
import { authenticate }    from "../../middleware/auth.middleware";
import { internalOnly }    from "../../middleware/internal.middleware";
import {
  lowStockAlertSchema,
} from "./notification.validator";
import {
  GetAllNotificationsHandler,
  GetNotificationByIdHandler,
  UpdateNotificationHandler,
  DeleteNotificationHandler,
  LowStockAlertHandler,
} from "./notification.controller";

const router = Router();

router.post(
  "/internal/low-stock",
  internalOnly,
  validateRequest(lowStockAlertSchema),
  LowStockAlertHandler
);

router.get(
  "/:storeId/store",
  authenticate,
  GetAllNotificationsHandler
);

router.get(
  "/:id",
  authenticate,
  GetNotificationByIdHandler
);

router.patch(
  "/:id",
  authenticate,
  UpdateNotificationHandler
);

router.delete(
  "/:id",
  authenticate,
  DeleteNotificationHandler
);

export default router;