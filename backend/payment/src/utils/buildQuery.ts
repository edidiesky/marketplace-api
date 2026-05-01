import { AuthenticatedRequest, UserType } from "../types";
import { Request } from "express";
import { IPayment } from "../models/Payment";
import { FilterQuery, Types } from "mongoose";

const toObjectId = (value: unknown): Types.ObjectId | undefined => {
  if (!value || value === "undefined" || value === "null") return undefined;
  try {
    return new Types.ObjectId(String(value));
  } catch {
    return undefined;
  }
};

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

  const queryObjects: FilterQuery<IPayment> = {};

  if (role !== "ADMIN") {
    const uid = toObjectId(userId);
    if (role === UserType.SELLERS) {
      if (uid) queryObjects.ownerId = uid;
    } else if (role === UserType.CUSTOMER || role === UserType.INVESTORS) {
      if (uid) queryObjects.customerId = uid;
    }
  }

  const sid = toObjectId(storeId);
  if (sid) queryObjects.storeId = sid;

  const oid = toObjectId(ownerId);
  if (oid) queryObjects.ownerId = oid;

  const cid = toObjectId(customerId);
  if (cid) queryObjects.customerId = cid;

  if (status) queryObjects.status = status;
  if (method) queryObjects.method = method;
  if (gateway) queryObjects.gateway = gateway;
  if (currency) queryObjects.currency = currency;

  if (startDate && endDate) {
    queryObjects.createdAt = {
      $gte: new Date(startDate as string),
      $lte: new Date(endDate as string),
    };
  } else if (startDate) {
    queryObjects.createdAt = { $gte: new Date(startDate as string) };
  } else if (endDate) {
    queryObjects.createdAt = { $lte: new Date(endDate as string) };
  }

  if (paidAt) {
    queryObjects.paidAt = { $lte: new Date(paidAt as string) };
  }

  if (refundedAt) {
    queryObjects.refundedAt = { $lte: new Date(refundedAt as string) };
  }

  if (search) {
    queryObjects.$or = [
      { method: { $regex: search, $options: "i" } },
      { customerEmail: { $regex: search, $options: "i" } },
      { customerName: { $regex: search, $options: "i" } },
      { status: { $regex: search, $options: "i" } },
      { paymentId: { $regex: search, $options: "i" } },
    ];
  }

  return queryObjects;
};
