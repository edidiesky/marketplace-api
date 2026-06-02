import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { organizationService }  from "./organization.service";
import { AuthenticatedRequest } from "../../middleware/contextMiddleware";
import { readGatewayContext }   from "../../utils/readGatewayContext";
import { AppError }             from "../../utils/AppError";
import {
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../../constant";

export const GetMyOrganizationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const org = await organizationService.getOrganizationByOwnerId(userId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    org,
    });
  }
);

export const GetOrganizationByIdHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params["organizationId"] as string;
    const org = await organizationService.getOrganizationById(organizationId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    org,
    });
  }
);

export const GetAllOrganizationsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const page  = Number(req.query["page"]  ?? 1);
    const limit = Number(req.query["limit"] ?? 20);

    const result = await organizationService.getAllOrganizations(page, limit);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const UpdateOrganizationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId }       = (req as AuthenticatedRequest).user;
    const ctx              = readGatewayContext(req);
    const organizationId   = ctx.user.organizationId ?? req.params["organizationId"] as string;

    if (!organizationId) throw AppError.badRequest("Organization ID is required.");

    const org = await organizationService.updateOrganization(
      organizationId,
      userId,
      req.body
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    org,
    });
  }
);