import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { storeService }               from "./store.service";
import { AuthenticatedRequest }       from "../../middleware/contextMiddleware";
import { AppError }                   from "../../utils/AppError";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../../constants";

export const CreateStoreHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId, organizationId, name } = (req as AuthenticatedRequest).user;

    if (!organizationId) {
      throw AppError.forbidden("Organization context required.");
    }

    const store = await storeService.createStore({
      ...req.body,
      ownerId:        userId,
      organizationId,
      ownerName:      name,
      ownerEmail: "",
    });

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success: true,
      data:    store,
    });
  }
);

export const GetMyStoresHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId }  = (req as AuthenticatedRequest).user;
    const page  = Number(req.query["page"]  ?? 1);
    const limit = Number(req.query["limit"] ?? 10);

    const result = await storeService.getMyStores(userId, page, limit);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const GetAllStoresHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const page  = Number(req.query["page"]  ?? 1);
    const limit = Number(req.query["limit"] ?? 10);

    const result = await storeService.getAllStores(page, limit);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const GetStoreByIdHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const storeId = req.params["storeId"] as string;
    const store   = await storeService.getStoreById(storeId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    store,
    });
  }
);

export const GetStoreBySubdomainHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const subdomain = req.params["subdomain"] as string;
    const store     = await storeService.getStoreBySubdomain(subdomain);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    store,
    });
  }
);

export const ResolveStoreByHostHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const host = req.query["host"] as string;

    if (!host) {
      throw AppError.badRequest("host query parameter is required.");
    }

    const store = await storeService.getStoreByHost(host);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    store,
    });
  }
);

export const UpdateStoreHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { organizationId } = (req as AuthenticatedRequest).user;
    const storeId = req.params["storeId"] as string;

    if (!organizationId) {
      throw AppError.forbidden("Organization context required.");
    }

    const store = await storeService.updateStore(
      storeId,
      organizationId,
      req.body
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    store,
    });
  }
);

export const UpdateStoreStatusHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const storeId = req.params["storeId"] as string;

    const store = await storeService.updateStoreStatus(storeId, req.body);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    store,
    });
  }
);

export const AddCustomDomainHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { organizationId } = (req as AuthenticatedRequest).user;
    const storeId = req.params["storeId"] as string;
    const { customDomain } = req.body as { customDomain: string };

    if (!organizationId) {
      throw AppError.forbidden("Organization context required.");
    }

    const store = await storeService.addCustomDomain(
      storeId,
      organizationId,
      customDomain
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    store,
      message: `Point a CNAME record from ${customDomain} to ${process.env.PLATFORM_DOMAIN}. Verification is automatic.`,
    });
  }
);

export const VerifyCustomDomainHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const storeId = req.params["storeId"] as string;

    const store = await storeService.verifyCustomDomain(storeId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    store,
    });
  }
);

export const RemoveCustomDomainHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { organizationId } = (req as AuthenticatedRequest).user;
    const storeId = req.params["storeId"] as string;

    if (!organizationId) {
      throw AppError.forbidden("Organization context required.");
    }

    const store = await storeService.removeCustomDomain(
      storeId,
      organizationId
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    store,
    });
  }
);

export const DeleteStoreHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { organizationId } = (req as AuthenticatedRequest).user;
    const storeId = req.params["storeId"] as string;

    if (!organizationId) {
      throw AppError.forbidden("Organization context required.");
    }

    await storeService.deleteStore(storeId, organizationId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      message: "Store deleted.",
    });
  }
);