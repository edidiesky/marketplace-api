import { FilterQuery, Types } from "mongoose";
import { AuthenticatedRequest } from "../types";
import { Request } from "express";
import { IOrder } from "../models/Order";
import logger from "./logger";

export const buildQuery = (req: Request): FilterQuery<Partial<IOrder>> => {
  const { userId, role } = (req as AuthenticatedRequest).user;
  const {
    cartId,
    fullName,
    totalPrice,
    search,
    orderStatus,
    paymentChannel,
    transactionId,
    paymentDate,
    startDate,
    endDate,
  } = req.query;

  let queryFilter: FilterQuery<Partial<IOrder>> = {
    storeId: new Types.ObjectId(req.params.storeId),
  };
  if (role !== "ADMIN") {
    queryFilter.userId = new Types.ObjectId(userId);
  }
  if (cartId) queryFilter.cartId = cartId;
  if (fullName) queryFilter.fullName = fullName;
  if (totalPrice) queryFilter.totalPrice = totalPrice;
  if (orderStatus) queryFilter.orderStatus = orderStatus;
  if (paymentChannel) queryFilter.paymentChannel = paymentChannel;
  if (transactionId) queryFilter.transactionId = transactionId;
  if (paymentDate) {
    queryFilter.createdAt = {
      $lte: new Date(paymentDate as string),
      $gte: new Date(paymentDate as string),
    };
  }

  if (startDate && endDate) {
    queryFilter.createdAt = {
      $lte: new Date(startDate as string),
      $gte: new Date(endDate as string),
    };
  }
  if (search) {
    queryFilter.$or = [
      {
        fullName: { $regex: search, $option: "i" },
        orderStatus: { $regex: search, $option: "i" },
        paymentChannel: { $regex: search, $option: "i" },
        transactionId: { $regex: search, $option: "i" },
        storeId: { $regex: search, $option: "i" },
      },
    ];
  }
  logger.info("Built query filter", {
    event: "query_filter_key",
    queryFilter,
    role,
    userId,
  });
  return queryFilter;
};
