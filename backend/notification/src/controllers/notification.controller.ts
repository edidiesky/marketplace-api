import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import {
  BAD_REQUEST_STATUS_CODE,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import { INotification } from "../models/Notification";
import { FilterQuery } from "mongoose";
import { AuthenticatedRequest } from "../types";
import { notificationService } from "../services/notification.service";
import { Types } from "mongoose";

const CreateNotificationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const storeId = req.params.storeid;
    const { userId } = (req as AuthenticatedRequest).user;
    const notification = await notificationService.CreateNotificationService(userId, storeId, {
      ...req.body,
    });
    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json(notification);
  }
);

const GetAllStoreNotificationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { page = 1, limit = 10 } = req.query;
    const storeId = req.params.storeid;

    const query: FilterQuery<INotification> = { storeId };
    if (userId) query.recipientId = new Types.ObjectId(userId);

    const skip = (Number(page) - 1) * Number(limit);
    const notifications = await notificationService.GetAllStoreNotificationService(
      query,
      skip,
      Number(limit)
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(notifications);
  }
);

const GetSingleStoreNotificationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const notification = await notificationService.GetASingleNotificationService(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(notification);
  }
);

const UpdateNotificationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingNotification = await notificationService.GetASingleNotificationService(id);

    if (!existingNotification) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This notification does not exist");
    }
    const notification = await notificationService.UpdateNotificationService(
      id,
      req.body as Partial<INotification>
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(notification);
  }
);

const DeleteNotificationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingNotification = await notificationService.GetASingleNotificationService(id);

    if (!existingNotification) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This notification does not exist");
    }
    const message = await notificationService.DeleteNotificationService(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(message);
  }
);

const CartReminderHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { orderId, userId } = req.body;
    const jobId = req.headers["x-job-id"] as string | undefined;
    const tenantId = req.headers["x-tenant-id"] as string | undefined;

    const notification = await notificationService.sendCartReminder({
      orderId,
      userId,
      jobId,
      tenantId,
    });

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success: true,
      notificationId: notification._id,
      status: notification.status,
    });
  }
);

const LowStockAlertHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { inventoryId, storeId, quantityAvailable, reorderPoint } = req.body;
    const jobId = req.headers["x-job-id"] as string | undefined;
    const tenantId = req.headers["x-tenant-id"] as string | undefined;

    const notification = await notificationService.sendLowStockAlert({
      inventoryId,
      storeId,
      quantityAvailable,
      reorderPoint,
      jobId,
      tenantId,
    });

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success: true,
      notificationId: notification._id,
      status: notification.status,
    });
  }
);

export {
  CreateNotificationHandler,
  GetAllStoreNotificationHandler,
  GetSingleStoreNotificationHandler,
  UpdateNotificationHandler,
  DeleteNotificationHandler,
  CartReminderHandler,
  LowStockAlertHandler,
};