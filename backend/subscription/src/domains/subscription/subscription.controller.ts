import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { subscriptionService } from "./subscription.service";
import {
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../../constants";
import { AuthenticatedRequest } from "../../middleware/contextMiddleware";
import { BillingPlan } from "./subscription.model";

export const GetMySubscriptionHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { organizationId } = (req as AuthenticatedRequest).user;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: "Organization context is required.",
      });
      return;
    }

    const subscription = await subscriptionService.getMySubscription(
      organizationId
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    subscription,
    });
  }
);

export const UpgradeSubscriptionHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { organizationId } = (req as AuthenticatedRequest).user;
    const { plan } = req.body as { plan: BillingPlan };

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: "Organization context is required.",
      });
      return;
    }

    const subscription = await subscriptionService.upgradeSubscription(
      organizationId,
      { plan }
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    subscription,
    });
  }
);

export const GetSubscriptionByOrgIdHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const organizationId = req.params["organizationId"] as string;

    const subscription =
      await subscriptionService.getSubscriptionByOrganizationId(
        organizationId
      );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    subscription,
    });
  }
);

export const CheckFeatureHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { organizationId, feature } = req.query as {
      organizationId: string;
      feature:        string;
    };

    if (!organizationId || !feature) {
      res.status(400).json({
        success: false,
        message: "organizationId and feature are required query parameters.",
      });
      return;
    }

    const result = await subscriptionService.checkFeature({
      organizationId,
      feature: feature as keyof import("./subscription.model").IPlanFeatures,
    });

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);