import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { notificationRepository }  from "./notification.repository";
import { getDispatcher }           from "../../providers/notification.dispatcher";
import { lowStockTemplate }        from "../../templates/low-stock.template";
import { AuthenticatedRequest }    from "../../middleware/contextMiddleware";
import { AppError }                from "../../utils/AppError";
import { Types }                   from "mongoose";
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "./notification.model";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../../constants";

export const GetAllNotificationsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const storeId    = req.params["storeId"] as string;
    const page       = Number(req.query["page"]  ?? 1);
    const limit      = Number(req.query["limit"] ?? 10);
    const skip       = (page - 1) * limit;

    const query: Record<string, unknown> = { storeId: new Types.ObjectId(storeId) };
    if (userId) query["recipientId"] = new Types.ObjectId(userId);

    const [notifications, total] = await Promise.all([
      notificationRepository.findAll(query, skip, limit),
      notificationRepository.count(query),
    ]);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data: {
        notifications,
        totalCount: total,
        totalPages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  }
);

export const GetNotificationByIdHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id           = req.params["id"] as string;
    const notification = await notificationRepository.findById(id);
    if (!notification) throw AppError.notFound("Notification not found.");

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    notification,
    });
  }
);

export const UpdateNotificationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id      = req.params["id"] as string;
    const existing = await notificationRepository.findById(id);
    if (!existing) throw AppError.notFound("Notification not found.");

    const updated = await notificationRepository.updateById(id, req.body);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    updated,
    });
  }
);

export const DeleteNotificationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const id       = req.params["id"] as string;
    const existing = await notificationRepository.findById(id);
    if (!existing) throw AppError.notFound("Notification not found.");

    await notificationRepository.deleteById(id);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      message: "Notification deleted.",
    });
  }
);

export const LowStockAlertHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const {
      inventoryId,
      storeId,
      productName,
      quantityAvailable,
      reorderPoint,
      email,
    } = req.body as {
      inventoryId:       string;
      storeId:           string;
      productName:       string;
      quantityAvailable: number;
      reorderPoint:      number;
      email:             string;
      sellerName:        string;
    };

    const { subject, html } = lowStockTemplate({
      inventoryId,
      storeId,
      productName,
      quantityAvailable,
      reorderPoint,
    });

    const notification = await notificationRepository.create({
      type:           NotificationType.LOW_STOCK_ALERT,
      channel:        NotificationChannel.EMAIL,
      status:         NotificationStatus.PENDING,
      recipientEmail: email,
      storeId:        new Types.ObjectId(storeId),
      inventoryId:    new Types.ObjectId(inventoryId),
      subject,
      message:        `Low stock alert for ${productName}`,
      metadata:       { inventoryId, storeId, productName, quantityAvailable, reorderPoint },
    });

    await getDispatcher().sendEmail(email, subject, html);
    await notificationRepository.markSent(notification._id.toString());

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success:        true,
      notificationId: notification._id,
    });
  }
);