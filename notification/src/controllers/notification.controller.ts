import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import {
  CreateNotificationService,
  GetAllStoreNotificationService,
  GetASingleNotificationService,
  UpdateNotificationService,
  DeleteNotificationService,
} from "../services/notification.service";
import {
  BAD_REQUEST_STATUS_CODE,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import { INotification } from "../models/Notification";
import { FilterQuery } from "mongoose";
import { AuthenticatedRequest } from "../types";

// @description: Create Notification handler
// @route  POST /notifications/
// @access  Private
const CreateNotificationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const storeId = req.params.storeid;
    const { userId } = (req as AuthenticatedRequest).user;
    const notification = await CreateNotificationService(userId, storeId, {
      ...req.body,
    });
    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json(notification);
  }
);

// @description: Get All Notifications Handler
// @route  GET /notifications
// @access  Private
const GetAllStoreNotificationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { page = 1, limit = 10, name, size, category, price } = req.query;
    const storeId = req.params.storeid;

    const query: FilterQuery<INotification> = {
      storeId,
    };
    if (size) query.size = size;
    if (userId) query.userId = userId;
    if (category) query.category = category;
    if (name) query.name = name;
    if (price) query.price = price;
    const skip = (Number(page) - 1) * Number(limit);

    const notifications = await GetAllStoreNotificationService(
      query,
      skip,
      Number(limit)
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(notifications);
  }
);

// @description: Get A Single Notification Handler
// @route  GET /notifications/:id
// @access  Public
const GetSingleStoreNotificationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const notification = await GetASingleNotificationService(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(notification);
  }
);

// @description: Update A Single Notification Handler
// @route  PUT /notifications/:id
// @access  Private
const UpdateNotificationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingNotification = await GetASingleNotificationService(id);

    if (!existingNotification) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This notification does not exist");
    }
    const notification = await UpdateNotificationService(
      id,
      req.body as Partial<INotification>
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(notification);
  }
);

// @description: Delete A Single Notification Handler
// @route  DELETE /notifications/:id
// @access  Private
const DeleteNotificationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingNotification = await GetASingleNotificationService(id);

    if (!existingNotification) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This notification does not exist");
    }
    const message = await DeleteNotificationService(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(message);
  }
);

export {
  CreateNotificationHandler,
  GetAllStoreNotificationHandler,
  GetSingleStoreNotificationHandler,
  UpdateNotificationHandler,
  DeleteNotificationHandler,
};
