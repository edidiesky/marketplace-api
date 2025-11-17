import asyncHandler from "express-async-handler";
import { Request, Response } from "express";

import {
  BAD_REQUEST_STATUS_CODE,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import { ITenant } from "../models/Tenant";
import { FilterQuery } from "mongoose";
import { AuthenticatedRequest } from "../types";
import { tenantService } from "../services";

// @description: Create Tenant handler
// @route  POST /api/v1/tenants
// @access  Private
const CreateTenantHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const storeId = req.params.storeid;
    const { userId } = (req as AuthenticatedRequest).user;
    const tenant = await tenantService.createTenant(userId, {
      ...req.body,
    });
    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json(tenant);
  }
);

// @description: Get All tenants Handler
// @route  GET /api/v1/tenants?page={page}&limit={limit}
// @access  Private
const GetAllTenantHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { page = 1, limit = 10, name, size, category, price } = req.query;
    const storeId = req.params.storeid;

    const query: FilterQuery<ITenant> = {
      storeId,
    };
    if (size) query.size = size;
    if (userId) query.userId = userId;
    if (category) query.category = category;
    if (name) query.name = name;
    if (price) query.price = price;
    const skip = (Number(page) - 1) * Number(limit);

    const tenants = await tenantService.getAllTenants(
      query,
      skip,
      Number(limit)
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(tenants);
  }
);

// @description: Get A Single Tenant Handler
// @route  GET /api/v1/tenants/:id
// @access  Public
const GetSingleTenantHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const Tenant = await tenantService.getTenantById(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(Tenant);
  }
);

// @description: Update A Single Tenant Handler
// @route  PUT /api/v1/tenants/:id
// @access  Private
const UpdateTenantHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingTenant = await tenantService.getTenantById(id);

    if (!existingTenant) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This Tenant does not exist");
    }
    const Tenant = await tenantService.updateTenant(
      id,
      req.body as Partial<ITenant>
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(Tenant);
  }
);

// @description: Delete A Single Tenant Handler
// @route  DELETE /api/v1/tenants/:id
// @access  Private
const DeleteTenantHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingTenant = await tenantService.getTenantById(id);

    if (!existingTenant) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This Tenant does not exist");
    }
    const message = await tenantService.deleteTenant(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(message);
  }
);

export {
  CreateTenantHandler,
  GetAllTenantHandler,
  GetSingleTenantHandler,
  UpdateTenantHandler,
  DeleteTenantHandler,
};
