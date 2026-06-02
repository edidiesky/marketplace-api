import { FilterQuery, Types } from "mongoose";
import { Request }            from "express";
import { IProduct }           from "../domains/product/product.model";
import { readGatewayContext } from "../utils/readGatewayContext";
import logger                 from "./logger";
import { SERVICE_NAME }       from "../constants";

export function buildProductQuery(
  req: Request
): FilterQuery<Partial<IProduct>> {
  const ctx      = readGatewayContext(req);
  const userType = ctx.user.userType;
  const storeId  = ctx.store.storeId ?? req.params["storeId"] ?? req.params["storeid"];

  const {
    name,
    size,
    isArchive,
    category,
    price,
    search,
    isDeleted,
    startDate,
    endDate,
  } = req.query;

  const query: FilterQuery<Partial<IProduct>> = {};

  if (storeId) {
    query["storeId"] = new Types.ObjectId(storeId);
  }

  const isAdmin =
    userType === "platform:admin" || userType === "platform:staff";

  if (!isAdmin) {
    query["isDeleted"] = isDeleted === "true";
  }

  if (size)      query["size"]      = size      as string;
  if (category)  query["category"]  = category  as string;
  if (isArchive) query["isArchive"] = isArchive === "true";
  if (price)     query["price"]     = Number(price);

  if (name) {
    query["name"] = { $regex: name as string, $options: "i" };
  }

  if (search) {
    query["$or"] = [
      { name:      { $regex: search as string, $options: "i" } },
      { ownerName: { $regex: search as string, $options: "i" } },
      { storeName: { $regex: search as string, $options: "i" } },
    ];
  }

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

  logger.info("product_query_built", {
    event:     "product_query_built",
    service:   SERVICE_NAME,
    userType,
    storeId,
    filters:   { size, category, isArchive, price, search, isDeleted, startDate, endDate },
    requestId: ctx.requestId,
  });

  return query;
}