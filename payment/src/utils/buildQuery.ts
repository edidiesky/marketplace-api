import { AuthenticatedRequest } from "../types";
import { Request } from "express";
import { IPayment } from "../models/Payment";
import { FilterQuery, Types } from "mongoose";
/**
 * @description Handler to build the user filter query object
 * @param req
 * @param user
 * @returns
 */
export const buildQuery = (req: Request): FilterQuery<IPayment> => {
  const {
    status,
    method,
    startDate,
    endDate,
    search,
    storeId,
    ownerId,
    customerId,
    gateway,
    currency,
    paidAt,
    refundedAt,
  } = req.query;
  const { userId, role } = (req as AuthenticatedRequest).user;

  let queryObjects: FilterQuery<IPayment> = {};
  if (role !== "ADMIN") {
    queryObjects.userId = new Types.ObjectId(String(userId));
  }
  if (String(storeId)) {
    queryObjects.storeId = new Types.ObjectId(String(storeId));
  }
  if (String(ownerId)) {
    queryObjects.ownerId = new Types.ObjectId(String(ownerId));
  }
  if (String(customerId)) {
    queryObjects.customerId = new Types.ObjectId(String(customerId));
  }
  if (status) queryObjects.status = status;
  if (method) queryObjects.method = method;
  if (gateway) queryObjects.gateway = gateway;
  if (startDate && endDate) {
    queryObjects.createdAt = {
      $gte: new Date(startDate as string),
      $lte: new Date(endDate as string),
    };
  } else if (startDate) {
    queryObjects.createdAt = { $gte: new Date(startDate as string) };
  }
  if (endDate) {
    queryObjects.createdAt = {
      ...queryObjects.createdAt,
      $lte: new Date(endDate as string),
    };
  }

  if (paidAt) {
    queryObjects.paidAt = {
      $lte: new Date(paidAt as string),
    };
  }

  if (refundedAt) {
    queryObjects.refundedAt = {
      $lte: new Date(refundedAt as string),
    };
  }
  if (currency) {
    queryObjects.currency = currency;
  }
  if (search) {
    queryObjects.$or = [
      { method: { $regex: search, $options: "i" } },
      { customerEmail: { $regex: search, $options: "i" } },
      { customerName: { $regex: search, $options: "i" } },
      { revenue: { $regex: search, $options: "i" } },
      { status: { $regex: search, $options: "i" } },
      { paymentId: { $regex: search, $options: "i" } },
    ];
  }

  return queryObjects;
};
