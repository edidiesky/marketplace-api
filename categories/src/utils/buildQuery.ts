import { ICategory } from "../models/Categories";
import { AuthenticatedRequest } from "../types";
import { Request } from "express";
import { FilterQuery } from "mongoose";

export default function buildQuery(req: Request): Partial<ICategory> {
  const { search, name, startDate, endDate } = req.query;
  const { userId } = (req as AuthenticatedRequest).user;
  const storeid = req.params.storeid;

  let queryFilter: FilterQuery<ICategory> = {
    store: storeid,
    user: userId,
  };

  if (startDate && endDate) {
    queryFilter.createdAt = {
      $gte: new Date(startDate as string),
      $lte: new Date(endDate as string),
    };
  }

  if (search) {
    queryFilter.$or = [
      { name: { $regex: search, $options: "i" } },
      { value: { $regex: search, $options: "i" } },
    ];
  }

  if (name) {
    queryFilter.name = { $regex: name, $options: "i" };
  }
  return queryFilter;
}
