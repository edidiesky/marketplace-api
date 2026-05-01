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
  if (role === "ADMIN" || role === "SELLER") {
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
        productTitle: { $regex: search, $options: "i" },
        ownerName: { $regex: search, $options: "i" },
        subdomain: { $regex: search, $options: "i" },
        storeName: { $regex: search, $options: "i" },
        storeDomain: { $regex: search, $options: "i" },
      },
    ];
  }
  logger.info("Built query filter", { queryFilter, role, userId });
  return queryFilter;
};
