import {
  measureDatabaseQuery,
  trackCacheHit,
  trackCacheMiss,
} from "../utils/metrics";
import redisClient from "../config/redis";
// import { sendMessage } from "../kafka/producer";
import Product, { IProduct } from "../models/Product";
import { FilterQuery, Types } from "mongoose";
import logger from "../utils/logger";

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
    logger.info("Fetched products from cache succesfully");
    trackCacheHit("product", "fetch_all_products");
    return JSON.parse(cachedProduct);
  }
  const products = await measureDatabaseQuery("fetch_all_products", () =>
    Product.find(query).skip(skip).limit(limit).sort("-createdAt").lean()
  );
  trackCacheMiss("product", "fetch_all_products");
  await redisClient.set(redisKey, JSON.stringify(products), "EX", 3600);
  logger.info("Cached products succesfully", { redisKey });

  return products;
};

// @description Get A Single Product
const GetASingleProductService = async (
  id: string
): Promise<IProduct | null> => {
  const redisKey = `product:${id}`;
  const cachedProduct = await redisClient.get(redisKey);
  if (cachedProduct) {
    logger.info("Fetched product from cache succesfully", { id });
    trackCacheHit("product", "fetch_single_product");
    return JSON.parse(cachedProduct);
  }
  const product = await measureDatabaseQuery("fetch_single_product", () =>
    Product.findById(id)
  );
  logger.info("Fetched product from DB succesfully", { id });
  if (product) {
    trackCacheMiss("product", "fetch_single_product");
    await redisClient.set(redisKey, JSON.stringify(product), "EX", 3600);
    logger.info("Cached product succesfully", { id });
  }
  return product;
};

// @description Update a Product
const UpdateProductService = async (
  productId: string,
  body: Partial<IProduct>
): Promise<IProduct | null> => {
  const product = await Product.findOneAndUpdate(
    { _id: productId },
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
  logger.info("Product metadata has been updated successfully!", {
    productId,
    body,
  });
  // Inavalidate cache via write through (later)
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
