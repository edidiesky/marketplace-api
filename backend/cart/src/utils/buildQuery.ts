import { FilterQuery, Types } from "mongoose";
import { Request } from "express";
import logger from "./logger";
import { AuthenticatedRequest } from "../middleware/contextMiddleware";
import { ICart } from "../domains/cart/cart.model";

export const buildQuery = (req: Request): FilterQuery<Partial<ICart>> => {
  const { userId, userType } = (req as AuthenticatedRequest).user;
  const {
    name,
    productTitle,
    quantityAvailable,
    quantityReserved,
    price,
    search,
    subdomain,
    domain,
    startDate,
    endDate,
    sellerId,
  } = req.query;

  let queryFilter: FilterQuery<Partial<ICart>> = {
    storeId: new Types.ObjectId(req.params.storeId),
  };
  if (userType !== "ADMIN") {
    queryFilter.userId = new Types.ObjectId(userId);
  }

  if (sellerId) queryFilter.sellerId = new Types.ObjectId(String(sellerId));
  if (productTitle) queryFilter.productTitle = productTitle;
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

  if (startDate && endDate) {
    queryFilter.createdAt = {
      $lte: new Date(startDate as string),
      $gte: new Date(endDate as string),
    };
  }
  logger.info("Built query filter", { queryFilter, userType, userId });
  return queryFilter;
};
