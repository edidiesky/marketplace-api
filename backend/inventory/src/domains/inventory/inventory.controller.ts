import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { inventoryService }         from "./inventory.service";
import { AuthenticatedRequest }     from "../../middleware/contextMiddleware";
import { AppError }                 from "../../utils/AppError";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../../constants";
import { readGatewayContext } from "../../utils/readGatewayContext";

export const CreateInventoryHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId, organizationId } = (req as AuthenticatedRequest).user;
    const storeId = req.params["storeId"] as string;

    if (!organizationId) {
      throw AppError.forbidden("Organization context required.");
    }

    const inventory = await inventoryService.createInventory({
      ...req.body,
      ownerId:        userId,
      organizationId,
      storeId,
    });

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success: true,
      data:    inventory,
    });
  }
);

export const GetStoreInventoryHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const ctx     = readGatewayContext(req);
    const storeId = ctx.store.storeId ?? req.params["storeId"] as string;

    if (!storeId) throw AppError.badRequest("Store ID is required.");

    const page  = Number(req.query["page"]  ?? 1);
    const limit = Number(req.query["limit"] ?? 20);

    const result = await inventoryService.getStoreInventory(
      storeId,
      page,
      limit
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const GetInventoryByIdHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const inventoryId = req.params["inventoryId"] as string;

    const inventory = await inventoryService.getInventoryById(inventoryId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    inventory,
    });
  }
);

export const CheckAvailabilityHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const productId = req.params["productId"] as string;
    const storeId   = req.query["storeId"]    as string;

    if (!storeId) {
      throw AppError.badRequest("storeId query parameter is required.");
    }

    const result = await inventoryService.checkAvailability(
      productId,
      storeId
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const UpdateInventoryHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { organizationId } = (req as AuthenticatedRequest).user;
    const inventoryId = req.params["inventoryId"] as string;

    if (!organizationId) {
      throw AppError.forbidden("Organization context required.");
    }

    const inventory = await inventoryService.updateInventory(
      inventoryId,
      organizationId,
      req.body
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    inventory,
    });
  }
);

export const DeleteInventoryHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { organizationId } = (req as AuthenticatedRequest).user;
    const inventoryId = req.params["inventoryId"] as string;

    if (!organizationId) {
      throw AppError.forbidden("Organization context required.");
    }

    await inventoryService.deleteInventory(inventoryId, organizationId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      message: "Inventory record deleted.",
    });
  }
);

export const ReserveStockHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { productId, storeId, quantity, sagaId, userId } = req.body as {
      productId: string;
      storeId:   string;
      quantity:  number;
      sagaId:    string;
      userId:    string;
    };

    const result = await inventoryService.reserveStock({
      productId,
      storeId,
      quantity,
      sagaId,
      userId,
    });

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const ReleaseStockHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { productId, storeId, quantity, sagaId, userId } = req.body as {
      productId: string;
      storeId:   string;
      quantity:  number;
      sagaId:    string;
      userId:    string;
    };

    const result = await inventoryService.releaseStock({
      productId,
      storeId,
      quantity,
      sagaId,
      userId,
    });

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const CommitStockHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { productId, storeId, quantity, sagaId, userId } = req.body as {
      productId: string;
      storeId:   string;
      quantity:  number;
      sagaId:    string;
      userId:    string;
    };

    const result = await inventoryService.commitStock({
      productId,
      storeId,
      quantity,
      sagaId,
      userId,
    });

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const ExpireReservationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const sagaId = req.params["sagaId"] as string;

    const result = await inventoryService.expireReservation(
      sagaId,
      req.body
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);