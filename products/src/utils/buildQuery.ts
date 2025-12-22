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
    isDeleted,
    startDate,
    endDate,
  } = req.query;

  let queryFilter: FilterQuery<Partial<IProduct>> = {
    store: new Types.ObjectId(req.params.storeid),
  };

  if (role !== "ADMIN") {
    queryFilter.ownerId = new Types.ObjectId(userId);
    queryFilter.isDeleted = isDeleted === "true" ? true : false;
  }

  if (size) queryFilter.size = size as string;
  if (category) queryFilter.category = category as string;
  if (name) queryFilter.name = { $regex: name as string, $options: "i" };
  if (isArchive) queryFilter.isArchive = isArchive === "true";
  if (price) queryFilter.price = Number(price);
  if (search) {
    queryFilter.$or = [
      { name: { $regex: search as string, $options: "i" } },
      { ownerName: { $regex: search as string, $options: "i" } },
      { storeName: { $regex: search as string, $options: "i" } },
    ];
  }

  if (startDate && endDate) {
    queryFilter.createdAt = {
      $lte: new Date(startDate as string),
      $gte: new Date(endDate as string),
    };
  }

  logger.info("product query filter", { queryFilter, role, userId });
  return queryFilter;
};
