import { FilterQuery, Types } from "mongoose";
import { AuthenticatedRequest } from "../types";
import { Request } from "express";
import { IInventory } from "../models/Inventory";
import logger from "./logger";

export const buildQuery = (req: Request): FilterQuery<Partial<IInventory>> => {
  const { userId, role } = (req as AuthenticatedRequest).user;
  const {
    productTitle,
    quantityAvailable,
    quantityReserved,
    search,
    subdomain,
    domain,
  } = req.query;

  let queryFilter: FilterQuery<Partial<IInventory>> = {
    storeId: new Types.ObjectId(req.params.storeId),
  };
  if (role !== "ADMIN") {
    queryFilter.ownerId = new Types.ObjectId(userId);
  }
  if (productTitle) queryFilter.productTitle = productTitle;
  if (quantityAvailable) queryFilter.quantityAvailable = quantityAvailable;
  if (quantityReserved) queryFilter.quantityReserved = quantityReserved;
  if (subdomain) queryFilter.subdomain = subdomain;
  if (domain) queryFilter.domain = domain;
  if (search) {
    queryFilter.$or = [
      {
        productTitle: { $regex: search, $option: "i" },
        ownerName: { $regex: search, $option: "i" },
        subdomain: { $regex: search, $option: "i" },
        storeName: { $regex: search, $option: "i" },
        storeDomain: { $regex: search, $option: "i" },
      },
    ];
  }
  logger.info("Built query filter", { queryFilter, role, userId });
  return queryFilter;
};
