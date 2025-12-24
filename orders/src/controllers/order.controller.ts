import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
  NOT_FOUND_STATUS_CODE,
} from "../constants";
import { AuthenticatedRequest } from "../types";
import { orderService } from "../services/order.service";
import { buildQuery } from "../utils/buildQuery";

const CreateOrderHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { cart, requestId } = req.body;

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
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = buildQuery(req);

    const result = await orderService.getUserOrders(query, skip, Number(limit));
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(result);
  }
);

const GetOrderHandler = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.getOrderById(req.params.id);
  if (!order) {
    res.status(NOT_FOUND_STATUS_CODE);
    throw new Error("Order not found");
  }
  res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(order);
});

export { CreateOrderHandler, GetUserOrdersHandler, GetOrderHandler };
