import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import {
  BAD_REQUEST_STATUS_CODE,
  SERVER_ERROR_STATUS_CODE,
  NOTIFICATION_STORE_ONBOARDING_COMPLETED_TOPIC,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import { AuthenticatedRequest } from "../types";
import { storeService } from "../services";
import { IStore } from "../models/Store";
import logger from "../utils/logger";
import { sendStoreMessage } from "../messaging/producer";
import { buildQuery } from "../utils/buildQuery";

// @description: Create Store handler
// @route  POST /api/v1/stores/
// @access  Private
const CreateStoreHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const storeData = req.body as Partial<IStore>;

    try {
      const store = await storeService.createStore(userId, storeData);
      sendStoreMessage(NOTIFICATION_STORE_ONBOARDING_COMPLETED_TOPIC, {
        notificationId: storeData.notificationId!,
        email: storeData.ownerEmail!,
        name: storeData.ownerName!,
        store: storeData.name!,
        plan: storeData.plan!,
        store_url: `${process.env.WEB_ORIGIN}`,
      }).catch((error) => {
        logger.error("Failed to send store creation notification", {
          error,
          storeId: store._id,
          email: storeData.ownerEmail,
        });
      });
      res
        .status(SUCCESSFULLY_CREATED_STATUS_CODE)
        .json({ success: true, data: store });
    } catch (error) {
      logger.error("Store creation failed", { error, userId });
      res
        .status(SERVER_ERROR_STATUS_CODE)
        .json({ success: false, message: "Failed to create store" });
    }
  }
);

// @description: Get All Stores Handler
// @route  GET /api/v1/stores?search=""&name=""
// @access  Private
const GetAllStoreHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 10 } = req.query;
    let queryFilter = await buildQuery(req);
    const skip = (Number(page) - 1) * Number(limit);
    const stores = await storeService.getAllStores(
      queryFilter,
      skip,
      Number(limit)
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(stores);
  }
);

// @description: Get A Single Store Handler
// @route  GET /api/v1/stores/:id
// @access  Public
const GetSingleStoreStoreHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const Store = await storeService.getStoreById(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(Store);
  }
);

// @description: Update A Single Store Handler
// @route  PUT /api/v1/stores/:id
// @access  Private
const UpdateStoreHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingStore = await storeService.getStoreById(id);

    if (!existingStore) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This Store does not exist");
    }
    const Store = await storeService.updateStore(
      id,
      req.body as Partial<IStore>
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(Store);
  }
);

// @description: Delete A Single Store Handler
// @route  DELETE /api/v1/stores/:id
// @access  Private
const DeleteStoreHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingStore = await storeService.getStoreById(id);

    if (!existingStore) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This Store does not exist");
    }
    const message = await storeService.deleteStore(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(message);
  }
);

export {
  CreateStoreHandler,
  GetAllStoreHandler,
  GetSingleStoreStoreHandler,
  UpdateStoreHandler,
  DeleteStoreHandler,
};
