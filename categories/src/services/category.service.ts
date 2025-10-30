import { FilterQuery, Types } from "mongoose";
import CategoryModel, { ICategory } from "../models/Categories";
import { CreateCategoryInput } from "../types/index";
import { measureDatabaseQuery } from "../utils/metrics";

export const CreateCategoryService = async (
  userId: string,
  storeId: string,
  { name, value }: CreateCategoryInput
) => {
  const categoryData = {
    user: new Types.ObjectId(userId),
    store: new Types.ObjectId(storeId),
    name,
    value,
  };

  return await CategoryModel.create(categoryData);
};

export const GetAllStoreCategoryService = async (
  queryFilter: FilterQuery<Partial<ICategory>>,
  skip: number,
  limit: number
): Promise<{
  categories: ICategory[];
  totalCount: number;
  totalPages: number;
}> => {
  const [categories, totalCount] = await Promise.all([
    CategoryModel.find(queryFilter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    measureDatabaseQuery("count_categories", () =>
      CategoryModel.countDocuments(queryFilter)
    ),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return { categories, totalCount, totalPages };
};

export const GetASingleCategoryService = async (id: string) => {
  return await CategoryModel.findById(new Types.ObjectId(id)).lean();
};

export const UpdateCategoryService = async (
  categoryId: string,
  updates: Partial<CreateCategoryInput>
) => {
  return await CategoryModel.findByIdAndUpdate(
    new Types.ObjectId(categoryId),
    updates,
    { new: true, runValidators: true }
  ).lean();
};

export const DeleteCategoryService = async (categoryId: string) => {
  await CategoryModel.findByIdAndDelete(new Types.ObjectId(categoryId));
};