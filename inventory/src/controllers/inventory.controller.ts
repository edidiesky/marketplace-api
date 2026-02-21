import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import {
  BAD_REQUEST_STATUS_CODE,
  NOT_FOUND_STATUS_CODE,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import { IInventory } from "../models/Inventory";
import { AuthenticatedRequest } from "../types";
import { inventoryService } from "../services/inventory.service";
import { buildQuery } from "../utils/buildQuery";
import logger from "../utils/logger";

// @description: Create Inventory handler
// @route  POST /api/v1/inventories/:storeId/store
// @access  Private
const CreateInventoryHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const inventory = await inventoryService.createInventory(userId, {
      ...req.body,
      storeId: req.params.storeId,
    });
    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json(inventory);
  }
);

// @description: Get All Inventorys Handler
// @route  GET /api/v1/inventories/:storeId/store
// @access  Private
const GetAllStoreInventoryHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { page = 1, limit = 10 } = req.query;

    const queryFilter = buildQuery(req);
    const skip = (Number(page) - 1) * Number(limit);

    const inventories = await inventoryService.getAllInventorys(
      queryFilter,
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
// FIX #7: Now checks for active reservations
const UpdateInventoryHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingInventory = await inventoryService.getInventoryById(id);

    if (!existingInventory) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This Inventory does not exist");
    }

    // FIX #7: Service now checks for active reservations
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
// FIX #7: Now checks for active reservations
const DeleteInventoryHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingInventory = await inventoryService.getInventoryById(id);

    if (!existingInventory) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This Inventory does not exist");
    }

    // FIX #7: Service now checks for active reservations
    await inventoryService.deleteInventory(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      message: "Inventory deleted successfully",
    });
  }
);

/**
 * @description: Check Inventory Availability Handler
 * @route  GET /api/v1/inventories/check/:productId?storeId=
 * @access  Public
 */
const CheckInventoryAvailabilityHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { productId } = req.params;
    const { storeId } = req.query;

    const inventory = await inventoryService.getInventoryByProduct(
      productId,
      storeId as string
    );

    if (!inventory) {
      res.status(NOT_FOUND_STATUS_CODE).json({
        quantityAvailable: 0,
        message: "Product not found",
      });
      return;
    }

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      productId,
      storeId,
      quantityAvailable: inventory.quantityAvailable,
      quantityOnHand: inventory.quantityOnHand,
      quantityReserved: inventory.quantityReserved,
    });
  }
);

// FIX #1: NEW ENDPOINTS - Reserve, Release, Commit

/**
 * @description: Reserve Stock Handler
 * @route  POST /api/v1/inventories/reserve
 * @access  Public (called by Cart Service)
 */
const ReserveStockHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { storeId, productId, quantity, userId, sagaId, reservationType } =
      req.body;

    if (!storeId || !productId || !quantity || !userId || !sagaId) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error(
        "Missing required fields: storeId, productId, quantity, userId, sagaId"
      );
    }

    if (quantity <= 0) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("Quantity must be greater than 0");
    }

    try {
      const inventory = await inventoryService.reserveStock(
        productId,
        storeId,
        quantity,
        sagaId
      );

      logger.info("Stock reservation successful via API", {
        productId,
        storeId,
        quantity,
        sagaId,
        userId,
        reservationType,
      });

      res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
        success: true,
        reservationId: `${sagaId}-${productId}`,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
        quantityReserved: quantity,
        remainingAvailable: inventory.quantityAvailable,
      });
    } catch (error: any) {
      // Handle specific error types
      if (error.message.includes("INSUFFICIENT_STOCK")) {
        const inventory = await inventoryService.getInventoryByProduct(
          productId,
          storeId
        );

        res.status(BAD_REQUEST_STATUS_CODE).json({
          success: false,
          availableStock: inventory?.quantityAvailable || 0,
          message: `Insufficient stock. Only ${inventory?.quantityAvailable || 0} available.`,
        });
        return;
      }

      if (error.message.includes("STOCK_CONTENTION")) {
        res.status(409).json({
          success: false,
          message: "Stock reservation in progress. Please retry.",
        });
        return;
      }

      throw error;
    }
  }
);

/**
 * @description: Release Stock Handler
 * @route  POST /api/v1/inventories/release
 * @access  Public (called by Cart Service)
 */
const ReleaseStockHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { storeId, productId, quantity, userId, sagaId, reservationType } =
      req.body;

    if (!storeId || !productId || !quantity || !userId || !sagaId) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error(
        "Missing required fields: storeId, productId, quantity, userId, sagaId"
      );
    }

    if (quantity <= 0) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("Quantity must be greater than 0");
    }

    try {
      const inventory = await inventoryService.releaseStock(
        productId,
        storeId,
        quantity,
        sagaId
      );

      logger.info("Stock release successful via API", {
        productId,
        storeId,
        quantity,
        sagaId,
        userId,
        reservationType,
      });

      res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
        success: true,
        releasedQuantity: quantity,
        newAvailable: inventory.quantityAvailable,
        remainingReserved: inventory.quantityReserved,
      });
    } catch (error: any) {
      if (error.message.includes("INSUFFICIENT_RESERVATION")) {
        res.status(BAD_REQUEST_STATUS_CODE).json({
          success: false,
          message: "Cannot release more than currently reserved",
        });
        return;
      }

      if (error.message.includes("STOCK_CONTENTION")) {
        res.status(409).json({
          success: false,
          message: "Stock operation in progress. Please retry.",
        });
        return;
      }

      throw error;
    }
  }
);

/**
 * @description: Commit Stock Handler (after successful payment)
 * @route  POST /api/v1/inventories/commit
 * @access  Public (called by Order Service)
 */
const CommitStockHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { storeId, productId, quantity, userId, sagaId } = req.body;

    if (!storeId || !productId || !quantity || !userId || !sagaId) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error(
        "Missing required fields: storeId, productId, quantity, userId, sagaId"
      );
    }

    if (quantity <= 0) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("Quantity must be greater than 0");
    }

    try {
      const inventory = await inventoryService.commitStock(
        productId,
        storeId,
        quantity,
        sagaId
      );

      logger.info("Stock commit successful via API", {
        productId,
        storeId,
        quantity,
        sagaId,
        userId,
      });

      res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
        success: true,
        committedQuantity: quantity,
        remainingOnHand: inventory.quantityOnHand,
        remainingReserved: inventory.quantityReserved,
      });
    } catch (error: any) {
      if (error.message.includes("RESERVATION_NOT_FOUND")) {
        res.status(NOT_FOUND_STATUS_CODE).json({
          success: false,
          message: "Reservation not found. May have been already committed or released.",
        });
        return;
      }

      if (error.message.includes("STOCK_CONTENTION")) {
        res.status(409).json({
          success: false,
          message: "Stock operation in progress. Please retry.",
        });
        return;
      }

      throw error;
    }
  }
);

export {
  CreateInventoryHandler,
  GetAllStoreInventoryHandler,
  GetSingleStoreInventoryHandler,
  UpdateInventoryHandler,
  DeleteInventoryHandler,
  CheckInventoryAvailabilityHandler,
  // FIX #1: NEW EXPORTS
  ReserveStockHandler,
  ReleaseStockHandler,
  CommitStockHandler,
};