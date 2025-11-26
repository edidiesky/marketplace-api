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
const CreateProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const storeId = req.params.storeid;
    const { userId } = (req as AuthenticatedRequest).user;
    const product = await inventoryService.createInventory(userId, {
      ...req.body,
    });
    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json(product);
  }
);

// @description: Get All Products Handler
// @route  GET /api/v1/inventories
// @access  Private
const GetAllStoreProductHandler = asyncHandler(
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
const GetSingleStoreProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const product = await inventoryService.getInventoryById(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(product);
  }
);

// @description: Update A Single Inventory Handler
// @route  PUT /api/v1/inventories/:id
// @access  Private
const UpdateProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingProduct = await inventoryService.getInventoryById(id);

    if (!existingProduct) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This product does not exist");
    }
    const product = await inventoryService.updateInventory(
      id,
      req.body as Partial<IInventory>
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(product);
  }
);

// @description: Delete A Single Inventory Handler
// @route  DELETE /api/v1/inventories/:id
// @access  Private
const DeleteProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingProduct = await inventoryService.getInventoryById(id);

    if (!existingProduct) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This product does not exist");
    }
    const message = await inventoryService.deleteInventory(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(message);
  }
);

export {
  CreateProductHandler,
  GetAllStoreProductHandler,
  GetSingleStoreProductHandler,
  UpdateProductHandler,
  DeleteProductHandler,
};
