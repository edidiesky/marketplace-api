import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
  BAD_REQUEST_STATUS_CODE,
} from "../constants";
import { AuthenticatedRequest } from "../types";
import { orderService } from "../services/order.service";

const CreateOrderHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { storeId } = req.params;
    const requestId = req.body.requestId || req.headers["idempotency-key"];

    if (!requestId) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("requestId or idempotency-key required");
    }

    const order = await orderService.createOrderFromCart(
      userId,
      cart,
      requestId as string
    );

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json(order);
  }
);

const GetUserOrdersHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { storeId } = req.params;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const result = await orderService.getUserOrders(
      userId,
      storeId,
      page,
      limit
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(result);
  }
);

const GetOrderHandler = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getOrderById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(order);
});

export { CreateOrderHandler, GetUserOrdersHandler, GetOrderHandler };
