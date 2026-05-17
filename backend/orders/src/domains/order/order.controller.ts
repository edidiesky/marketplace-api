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

export const CheckoutHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId }  = (req as AuthenticatedRequest).user;
    const storeId     = req.params["storeId"] as string;
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

export const GetStoreOrdersHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const storeId     = req.params["storeId"] as string;
    const page        = Number(req.query["page"]  ?? 1);
    const limit       = Number(req.query["limit"] ?? 10);
    const orderStatus = req.query["orderStatus"]  as string | undefined;

    const query: Record<string, unknown> = {
      storeId: new Types.ObjectId(storeId),
    };
    if (orderStatus) query["orderStatus"] = orderStatus;

    const result = await orderService.getOrders(query, page, limit);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
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