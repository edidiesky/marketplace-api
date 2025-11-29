import { FilterQuery } from "mongoose";
import { AuthenticatedRequest } from "../types";
import { Request } from "express";
import { IStore } from "../models/Store";
import logger from "./logger";

export const buildQuery = async (
  req: Request
): Promise<FilterQuery<Partial<IStore>>> => {
  const { userId, role } = (req as AuthenticatedRequest).user;
  const { name, size, category, price, search, subdomain, domain } = req.query;

  let queryFilter: FilterQuery<Partial<IStore>> = {};
  if (role !== "ADMIN") {
    queryFilter.ownerId = userId;
  }

  if (size) queryFilter.size = size;
  if (userId) queryFilter.userId = userId;
  if (category) queryFilter.category = category;
  if (name) queryFilter.name = name;
  if (price) queryFilter.price = price;
  if (subdomain) queryFilter.subdomain = subdomain;
  if (domain) queryFilter.domain = domain;
  if (search) {
    queryFilter.$or = [
      {
        ownerName: { $regex: search, $option: "i" },
        ownerEmail: { $regex: search, $option: "i" },
        subdomain: { $regex: search, $option: "i" },
        domain: { $regex: search, $option: "i" },
      },
    ];
  }
  logger.info("Built query filter", { queryFilter, role, userId });
  return queryFilter;
};
