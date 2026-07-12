import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { orderService }         from "./order.service";
import { AuthenticatedRequest } from "../../middleware/contextMiddleware";
import { AppError }             from "../../utils/AppError";
import { FulfillmentStatus }    from "./order.model";
import { Types }                from "mongoose";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../../constants";
import { readGatewayContext } from "../../utils/readGatewayContext";

export const CheckoutHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const ctx        = readGatewayContext(req);
    const storeId    = ctx.store.storeId ?? req.params["storeId"] as string;

    if (!storeId) throw AppError.badRequest("Store ID is required.");

    const { cartId, requestId } = req.body as {
      cartId:    string;
      requestId: string;
    };

    const order = await orderService.checkout({
      userId,
      storeId,
      cartId,
      requestId,
    });

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success: true,
      data:    order,
    });
  }
);

export const GetOrderAnalyticsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const ctx     = readGatewayContext(req);
    const storeId = ctx.store.storeId ?? req.params["storeId"] as string;

    if (!storeId) throw AppError.badRequest("Store ID is required.");

    const range = (req.query["range"] as string) ?? "3-months";
    const analytics = await orderService.getAnalytics(storeId, range);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    analytics,
    });
  }
);

export const GetOrderStatsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const ctx     = readGatewayContext(req);
    const storeId = ctx.store.storeId ?? req.params["storeId"] as string;

    if (!storeId) throw AppError.badRequest("Store ID is required.");

    const breakdown = await orderService.getStatusBreakdown(storeId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    breakdown,
    });
  }
);

export const GetStoreOrdersHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const ctx     = readGatewayContext(req);
    const storeId = ctx.store.storeId ?? req.params["storeId"] as string;

    if (!storeId) throw AppError.badRequest("Store ID is required.");

    const page              = Number(req.query["page"]  ?? 1);
    const limit             = Number(req.query["limit"] ?? 10);
    const orderStatus       = req.query["orderStatus"]       as string | undefined;
    const fulfillmentStatus = req.query["fulfillmentStatus"] as string | undefined;

    const query: Record<string, unknown> = {
      storeId: new Types.ObjectId(storeId),
    };
    if (orderStatus)       query["orderStatus"]       = orderStatus;
    if (fulfillmentStatus) query["fulfillmentStatus"] = fulfillmentStatus;

    const result = await orderService.getOrders(query, page, limit);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);
export const AddShippingHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const orderId    = req.params["orderId"] as string;

    const order = await orderService.addShipping(userId, orderId, req.body);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    order,
    });
  }
);

export const GetOrderHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const orderId = req.params["id"] as string;

    const order = await orderService.getOrderById(orderId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    order,
    });
  }
);

export const GetUserOrdersHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const page       = Number(req.query["page"]  ?? 1);
    const limit      = Number(req.query["limit"] ?? 10);

    const result = await orderService.getOrders(
      { userId: new Types.ObjectId(userId) },
      page,
      limit
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const UpdateFulfillmentHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const orderId    = req.params["orderId"] as string;
    const { status, trackingNumber, courierName } = req.body as {
      status:          FulfillmentStatus;
      trackingNumber?: string;
      courierName?:    string;
    };

    const order = await orderService.updateFulfillment({
      sellerId: userId,
      orderId,
      status,
      trackingNumber,
      courierName,
    });

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    order,
    });
  }
);

export const AbandonOrderHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const orderId = req.params["orderId"] as string;
    const { reason } = req.body as { reason?: string };

    const order = await orderService.abandonOrder(orderId, reason);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success:     true,
      orderId:     order.orderId,
      orderStatus: order.orderStatus,
      abandonedAt: new Date().toISOString(),
    });
  }
);