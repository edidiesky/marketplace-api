import { FilterQuery, Types } from "mongoose";
import SizeModel, { ISize } from "../models/Size";
import { CreateSizeInput } from "../types/index";
import { measureDatabaseQuery } from "../utils/metrics";

/**
 * @description Create Size Service
 * @param userId
 * @param storeId
 * @returns
 */
export const CreateSizeService = async (
  userId: string,
  storeId: string,
  { name, value }: CreateSizeInput
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
  return await SizeModel.findById(new Types.ObjectId(id)).lean();
};

/**
 * @description update a single store size
 * @param id
 * @returns
 */
export const UpdateSizeService = async (
  sizeId: string,
  updates: Partial<CreateSizeInput>
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
