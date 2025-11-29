import { FilterQuery, Types } from "mongoose";
import { AuthenticatedRequest } from "../types";
import { Request } from "express";
import { IInventory } from "../models/Inventory";
import logger from "./logger";

export const buildQuery = async (
  req: Request
): Promise<FilterQuery<Partial<IInventory>>> => {
  const { userId, role } = (req as AuthenticatedRequest).user;
  const {
    name,
    productTitle,
    quantityAvailable,
    quantityReserved,
    price,
    search,
    subdomain,
    domain,
  } = req.query;

  let queryFilter: FilterQuery<Partial<IInventory>> = {
    storeId: new Types.ObjectId(req.params.storeid),
  };
  if (role !== "ADMIN") {
    queryFilter.ownerId = new Types.ObjectId(userId);
  }

  if (productTitle) queryFilter.productTitle = productTitle;
  if (userId) queryFilter.ownerId = new Types.ObjectId(userId);
  if (quantityAvailable) queryFilter.quantityAvailable = Number(quantityAvailable);
  if (quantityReserved) queryFilter.quantityReserved = Number(quantityReserved);
  if (name) queryFilter.name = name;
  if (price) queryFilter.price = price;
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
