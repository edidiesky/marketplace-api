import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import {
  BAD_REQUEST_STATUS_CODE,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import { IInventory } from "../models/Inventory";
import { FilterQuery } from "mongoose";
import { AuthenticatedRequest } from "../types";
import { inventoryService } from "../services/inventory.service";

// @description: Create Inventory handler
// @route  POST /api/v1/inventories
// @access  Private
const CreateInventoryHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const inventory = await inventoryService.createInventory(userId, {
      ...req.body,
    });
    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json(inventory);
  }
);

// @description: Get All Inventorys Handler
// @route  GET /api/v1/inventories
// @access  Private
const GetAllStoreInventoryHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { page = 1, limit = 10, name, size, category, price } = req.query;
    const storeId = req.params.storeid;

    const query: FilterQuery<IInventory> = {
      storeId,
    };
    if (size) query.size = size;
    if (userId) query.userId = userId;
    if (category) query.category = category;
    if (name) query.name = name;
    if (price) query.price = price;
    const skip = (Number(page) - 1) * Number(limit);

    const inventories = await inventoryService.getAllInventorys(
      query,
      skip,
      Number(limit)
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(inventories);
  }
);

// @description: Get A Single Inventory Handler
// @route  GET /api/v1/inventories/:id
// @access  Public
const GetSingleStoreInventoryHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const Inventory = await inventoryService.getInventoryById(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(Inventory);
  }
);

// @description: Update A Single Inventory Handler
// @route  PUT /api/v1/inventories/:id
// @access  Private
const UpdateInventoryHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingInventory = await inventoryService.getInventoryById(id);

    if (!existingInventory) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This Inventory does not exist");
    }
    const Inventory = await inventoryService.updateInventory(
      id,
      req.body as Partial<IInventory>
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(Inventory);
  }
);

// @description: Delete A Single Inventory Handler
// @route  DELETE /api/v1/inventories/:id
// @access  Private
const DeleteInventoryHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingInventory = await inventoryService.getInventoryById(id);

    if (!existingInventory) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This Inventory does not exist");
    }
    const message = await inventoryService.deleteInventory(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(message);
  }
);

export {
  CreateInventoryHandler,
  GetAllStoreInventoryHandler,
  GetSingleStoreInventoryHandler,
  UpdateInventoryHandler,
  DeleteInventoryHandler,
};
