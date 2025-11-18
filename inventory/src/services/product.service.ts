import { measureDatabaseQuery } from "../utils/metrics";
import redisClient from "../config/redis";
// import { sendMessage } from "../kafka/producer";
import Product, { IProduct } from "../models/Inventory";
import { FilterQuery, Types } from "mongoose";

// @description Create a Product
const CreateProductService = async (
  user: string,
  store: string,
  body: Partial<IProduct>
): Promise<IProduct> => {
  const productData = {
    user: new Types.ObjectId(user),
    store: new Types.ObjectId(store),
    ...body,
  };
  const product = await measureDatabaseQuery("create_product", () =>
    Product.create(productData)
  );
  //   if (product) {
  //     await sendMessage("inventory.product_added", {
  //       product: product._id,
  //       name: product.name,
  //       availableStock: body.availableStock,
  //       thresholdStock: body.thresholdStock,
  //     });
  //   }
  return product;
};

// @description Get All Products
const GetAllStoreProductService = async (
  query: FilterQuery<IProduct>,
  skip: number,
  limit: number
): Promise<IProduct[]> => {
  const redisKey = `product:search:${JSON.stringify({
    ...query,
    skip,
    limit,
  })}`;
  const cachedProduct = await redisClient.get(redisKey);
  if (cachedProduct) {
    return JSON.parse(cachedProduct);
  }
  const products = await measureDatabaseQuery("fetch_all_products", () =>
    Product.find(query).skip(skip).limit(limit).sort("-createdAt").lean()
  );
  await redisClient.set(redisKey, JSON.stringify(products), "EX", 3600);
  return products;
};

// @description Get A Single Product
const GetASingleProductService = async (
  id: string
): Promise<IProduct | null> => {
  const redisKey = `product:${id}`;
  const cachedProduct = await redisClient.get(redisKey);
  if (cachedProduct) {
    return JSON.parse(cachedProduct);
  }
  const product = await measureDatabaseQuery("fetch_single_product", ()=> Product.findById(id));
  if (product) {
    await redisClient.set(redisKey, JSON.stringify(product), "EX", 3600);
  }
  return product;
};

// @description Update a Product
const UpdateProductService = async (
  productId: string,
  body: Partial<IProduct>
): Promise<IProduct | null> => {
  const product = await Product.findByIdAndUpdate(
    productId,
    { $set: body },
    { new: true, runValidators: true }
  );
  //   if (product) {
  //     await sendMessage("inventory.product_edited", {
  //       product: product._id,
  //       name: product.name,
  //       availableStock: body.availableStock,
  //       thresholdStock: body.thresholdStock,
  //     });
  //   }
  return product;
};

// @description Delete a Product
const DeleteProductService = async (id: string): Promise<string> => {
  const redisKey = `product:${id}`;
  await Product.findByIdAndDelete(id);
  //   await sendMessage("inventory.product_removed", { product: id });
  await redisClient.del(redisKey);
  return "Product has been deleted";
};

export {
  CreateProductService,
  GetAllStoreProductService,
  GetASingleProductService,
  UpdateProductService,
  DeleteProductService,
};
