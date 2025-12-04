import { FilterQuery, Types } from "mongoose";
import { AuthenticatedRequest } from "../types";
import { Request } from "express";
import { ICart } from "../models/Cart";
import logger from "./logger";

export const buildQuery = async (
  req: Request
): Promise<FilterQuery<Partial<ICart>>> => {
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

  let queryFilter: FilterQuery<Partial<ICart>> = {
    storeId: new Types.ObjectId(req.params.storeid),
  };
  if (role !== "ADMIN") {
    queryFilter.ownerId = userId;
  }

  if (productTitle) queryFilter.productTitle = productTitle;
  if (userId) queryFilter.ownerId = new Types.ObjectId(userId);
  if (quantityAvailable) queryFilter.quantityAvailable = quantityAvailable;
  if (quantityReserved) queryFilter.quantityReserved = quantityReserved;
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
