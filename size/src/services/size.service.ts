import { FilterQuery, Types } from "mongoose";
import SizeModel, { ISize } from "../models/Size";
import { measureDatabaseQuery, trackCacheHit, trackCacheMiss } from "../utils/metrics";
import redisClient from "../config/redis";
import logger from "../utils/logger";

/**
 * @description Create Size Service
 * @param userId
 * @param storeId
 * @returns
 */
export const CreateSizeService = async (
  userId: string,
  storeId: string,
  { name, value }: Partial<ISize>
) => {
  const sizeData = {
    user: new Types.ObjectId(userId),
    store: new Types.ObjectId(storeId),
    name,
    value,
  };

  const size = await SizeModel.create(sizeData);
  return size;
};

/**
 * @description Get all store sizes
 * @param id
 * @returns
 */
export const GetAllStoreSizeService = async (
  queryFilter: FilterQuery<Partial<ISize>>,
  skip: number,
  limit: number
): Promise<{
  sizes: ISize[];
  totalCount: number;
  totalPages: number;
}> => {
  const sizes = await SizeModel.find({
    ...queryFilter,
  })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();

  const totalCount = await measureDatabaseQuery("count payment doc:", () =>
    SizeModel.countDocuments(queryFilter)
  );
  const totalPages = Math.ceil(totalCount / limit);

  return {
    sizes,
    totalCount,
    totalPages,
  };
};

/**
 * @description Get a single store size
 * @param id
 * @returns
 */
export const GetASingleSizeService = async (id: string) => {
   const redisKey = `size:${id}`;
  const cachedSize = await redisClient.get(redisKey);
  if (cachedSize) {
    logger.info("Fetched size from cache succesfully", { id });
    trackCacheHit("size", "fetch_single_product");
    return JSON.parse(cachedSize);
  }
  const size = await measureDatabaseQuery("fetch_single_product", () =>
    SizeModel.findById(id)
  );
  logger.info("Fetched size from DB succesfully", { id });
  if (size) {
    trackCacheMiss("size", "fetch_single_product");
    await redisClient.set(redisKey, JSON.stringify(size), "EX", 3600);
    logger.info("Cached size succesfully", { id });
  }
  return size;
};

/**
 * @description update a single store size
 * @param id
 * @returns
 */
export const UpdateSizeService = async (
  sizeId: string,
  updates: Partial<Partial<ISize>>
) => {
  return await SizeModel.findByIdAndUpdate(
    new Types.ObjectId(sizeId),
    updates,
    { new: true, runValidators: true }
  ).lean();
};

/**
 * @description delete a single store size
 * @param id
 * @returns
 */
export const DeleteSizeService = async (sizeId: string) => {
  await SizeModel.findByIdAndDelete(new Types.ObjectId(sizeId));
  return "Size has been deleted";
};
