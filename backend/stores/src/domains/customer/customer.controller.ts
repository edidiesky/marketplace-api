import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { customerService } from "./customer.service";
import { AppError } from "../../utils/AppError";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../../constants";

export const GetStoreCustomersHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const storeId = req.params["storeId"] as string;

    if (!storeId) throw AppError.badRequest("Store ID is required.");

    const page  = Number(req.query["page"]  ?? 1);
    const limit = Number(req.query["limit"] ?? 20);

    const result = await customerService.getStoreCustomers(storeId, page, limit);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);