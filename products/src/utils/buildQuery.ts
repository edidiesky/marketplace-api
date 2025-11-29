import { FilterQuery, Types } from "mongoose";
import { AuthenticatedRequest } from "../types";
import { Request } from "express";
import { IProduct } from "../models/Product";
import logger from "./logger";

export const buildQuery = async (
  req: Request
): Promise<FilterQuery<Partial<IProduct>>> => {
  const { userId, role } = (req as AuthenticatedRequest).user;
  const {
    name,
    size,
    isArchive,
    category,
    price,
    search,
    storeDomain,
    storeName,
    isDeleted
  } = req.query;

  let queryFilter: FilterQuery<Partial<IProduct>> = {
    storeId: new Types.ObjectId(req.params.storeid),
  };
  if (role !== "ADMIN") {
    queryFilter.ownerId = new Types.ObjectId(userId);
    isDeleted !== "true" ? queryFilter.isDeleted = false : queryFilter.isDeleted = true;
  }

  if (size) queryFilter.size = size;
  if (userId) queryFilter.ownerId = new Types.ObjectId(userId);
  if (category) queryFilter.category = category;
  if (name) queryFilter.name = name;
  if (isArchive) queryFilter.isArchive = isArchive === "true";
  if (price) queryFilter.price = price;
  if (storeDomain) queryFilter.storeDomain = storeDomain;
  if (storeName) queryFilter.storeName = storeName;
  if (search) {
    queryFilter.$or = [
      {
        ownerName: { $regex: search, $option: "i" },
        ownerEmail: { $regex: search, $option: "i" },
        storeDomain: { $regex: search, $option: "i" },
        storeName: { $regex: search, $option: "i" },
      },
    ];
  }
  logger.info("product query filter", { queryFilter, role, userId });
  return queryFilter;
};
