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


/**
 * @openapi
 * /api/v1/notifications/{userId}:
 *   get:
 *     tags: [Notifications]
 *     summary: Get all notifications for a user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [order, payment, delivery, system]
 *     responses:
 *       200:
 *         description: Notifications list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     totalCount:
 *                       type: number
 *                     unreadCount:
 *                       type: number
 */

/**
 * @openapi
 * /api/v1/notifications/{notificationId}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark a notification as read
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Marked as read
 *       404:
 *         description: Notification not found
 */

/**
 * @openapi
 * /api/v1/notifications/{userId}/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read for a user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */

/**
 * @openapi
 * /api/v1/notifications/{notificationId}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete a notification
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 *       404:
 *         description: Not found
 */