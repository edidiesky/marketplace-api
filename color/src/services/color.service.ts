import { FilterQuery, Types } from "mongoose";
import colorModel, { IColor } from "../models/Color";
import { CreateColorInput } from "../types/index";
import { measureDatabaseQuery } from "../utils/metrics";

/**
 * @description Create color Service
 * @param userId
 * @param storeId
 * @returns
 */
export const CreateColorService = async (
  userId: string,
  storeId: string,
  tenantId:string,
  { name, value }: CreateColorInput
) => {
  const colorData = {
    user: new Types.ObjectId(userId),
    store: new Types.ObjectId(storeId),
    tenantId:new Types.ObjectId(tenantId),
    name,
    value,
  };

  const color = await colorModel.create(colorData);
  return color;
};

/**
 * @description Get all store colors
 * @param id
 * @returns
 */
export const GetAllStoreColorService = async (
  queryFilter: FilterQuery<Partial<IColor>>,
  skip: number,
  limit: number
): Promise<{
  colors: IColor[];
  totalCount: number;
  totalPages: number;
}> => {
  const colors = await colorModel.find({
    ...queryFilter,
  })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 })
    .lean();

  const totalCount = await measureDatabaseQuery("count payment doc:", () =>
    colorModel.countDocuments(queryFilter)
  );
  const totalPages = Math.ceil(totalCount / limit);

  return {
    colors,
    totalCount,
    totalPages,
  };
};

/**
 * @description Get a single store color
 * @param id
 * @returns
 */
export const GetASingleColorService = async (id: string) => {
  return await colorModel.findById(new Types.ObjectId(id)).lean();
};

/**
 * @description update a single store color
 * @param id
 * @returns
 */
export const UpdateColorService = async (
  colorId: string,
  updates: Partial<CreateColorInput>
) => {
  return await colorModel.findByIdAndUpdate(
    new Types.ObjectId(colorId),
    updates,
    { new: true, runValidators: true }
  ).lean();
};

/**
 * @description delete a single store color
 * @param id
 * @returns
 */
export const DeleteColorService = async (colorId: string) => {
  await colorModel.findByIdAndDelete(new Types.ObjectId(colorId));
  return "color has been deleted";
};
