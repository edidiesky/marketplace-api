import express from "express";
import {
  CreateNotificationHandler,
  UpdateNotificationHandler,
  DeleteNotificationHandler,
} from "../controllers/notification.controller";
import {
  authenticate,
} from "../middleware/auth.middleware";
import { notificationSchema } from "../validators/notification.validation";
import { validateRequest } from "../middleware/validate.middleware";
const router = express.Router();

router
  .route("/:storeid")
  .post(
    authenticate,
    validateRequest(notificationSchema),
    CreateNotificationHandler
  )

router
  .route("/:id")
  .get(authenticate, )
  .put(authenticate, UpdateNotificationHandler)
  .delete(authenticate, DeleteNotificationHandler);
export default router;
