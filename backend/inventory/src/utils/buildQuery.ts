import { FilterQuery, Types } from "mongoose";
import { Request } from "express";
import logger from "./logger";
import { IInventory } from "../domains/inventory/inventory.model";
import { AuthenticatedRequest } from "../middleware/contextMiddleware";

export const buildQuery = (req: Request): FilterQuery<Partial<IInventory>> => {
  const { userId, userType } = (req as AuthenticatedRequest).user;
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
  if (userType === "ADMIN" || userType === "SELLER") {
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
  logger.info("Built query filter", { queryFilter, userType, userId });
  return queryFilter;
};
