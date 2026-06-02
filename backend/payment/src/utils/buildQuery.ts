import { Request }            from "express";
import { FilterQuery, Types } from "mongoose";
import { IPayment }           from "../domains/payment/payment.model";
import { readGatewayContext } from "./readGatewayContext";

function toObjectId(value: unknown): Types.ObjectId | undefined {
  if (!value || value === "undefined" || value === "null") return undefined;
  try {
    return new Types.ObjectId(String(value));
  } catch {
    return undefined;
  }
}

export function buildPaymentQuery(req: Request): FilterQuery<IPayment> {
  const ctx = readGatewayContext(req);

  const userId   = ctx.user.userId;
  const userType = ctx.user.userType;
  const storeId  = (ctx.store.storeId ?? req.query["storeId"]) as string | undefined;

  const {
    status,
    method,
    startDate,
    endDate,
    search,
    ownerId,
    customerId,
    gateway,
    currency,
    paidAt,
    refundedAt,
  } = req.query;

  const query: FilterQuery<IPayment> = {};

  if (userType !== "platform:admin" && userType !== "platform:staff") {
    const uid = toObjectId(userId);

    if (
      userType === "seller:admin" ||
      userType === "seller:member" ||
      userType === "seller:viewer"
    ) {
      if (uid) query["ownerId"] = uid;
    } else if (userType === "customer" || userType === "investor") {
      if (uid) query["customerId"] = uid;
    }
  }

  const sid = toObjectId(storeId);
  if (sid) query["storeId"] = sid;

  const oid = toObjectId(ownerId as string | undefined);
  if (oid) query["ownerId"] = oid;

  const cid = toObjectId(customerId as string | undefined);
  if (cid) query["customerId"] = cid;

  if (status)   query["status"]   = status;
  if (method)   query["method"]   = method;
  if (gateway)  query["gateway"]  = gateway;
  if (currency) query["currency"] = currency;

  if (startDate && endDate) {
    query["createdAt"] = {
      $gte: new Date(startDate as string),
      $lte: new Date(endDate   as string),
    };
  } else if (startDate) {
    query["createdAt"] = { $gte: new Date(startDate as string) };
  } else if (endDate) {
    query["createdAt"] = { $lte: new Date(endDate   as string) };
  }

  if (paidAt)     query["paidAt"]     = { $lte: new Date(paidAt     as string) };
  if (refundedAt) query["refundedAt"] = { $lte: new Date(refundedAt as string) };

  if (search) {
    query["$or"] = [
      { method:        { $regex: search, $options: "i" } },
      { customerEmail: { $regex: search, $options: "i" } },
      { customerName:  { $regex: search, $options: "i" } },
      { status:        { $regex: search, $options: "i" } },
      { paymentId:     { $regex: search, $options: "i" } },
    ];
  }

  return query;
}