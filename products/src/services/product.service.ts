import { IProductRepository } from "../repository/IProductRepository";
import { IProduct } from "../models/Product";
import mongoose, { FilterQuery } from "mongoose";
import { withTransaction } from "../utils/withTransaction";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";
import Product from "../models/Product";
import logger from "../utils/logger";
import OutboxEvent, { IOutboxEventType } from "../models/OutboxEvent";

export class ProductService {
  private productRepo: IProductRepository;
  constructor(productRepo: IProductRepository) {
    this.productRepo = productRepo;
  }

  async CreateProductService(
    userId: string,
    body: Partial<IProduct>,
  ): Promise<IProduct> {
    return withTransaction(async (session) => {
      const productData = {
        ownerId: new mongoose.Types.ObjectId(userId),
        ...body,
      };

      const product = await this.productRepo.createProduct(
        productData,
        session,
      );
      if (!product) {
        logger.error("Failed to create product");
        throw new Error("Failed to create product");
      }
      return product;
    });
  }

  async getAllProducts(
    query: FilterQuery<IProduct>,
    skip: number,
    limit: number,
  ) {
    const [products, totalCount] = await Promise.all([
      this.productRepo.findAllProduct(query, skip, limit),
      Product.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit || 1);

    return {
      data: { products, totalCount, totalPages },
      success: true,
      statusCode: SUCCESSFULLY_FETCHED_STATUS_CODE,
    };
  }

  async getProductById(id: string): Promise<IProduct | null> {
    return this.productRepo.findProductById(id);
  }

  async updateProduct(id: string, body: Partial<IProduct>) {
    const session = await mongoose.startSession();
    let result: IProduct | null = null;
    await session.withTransaction(async () => {
      result = await Product.findByIdAndUpdate(id, body, {
        new: true,
        session,
      });
      if (!result) throw new Error("Product not found");
      await OutboxEvent.create(
        [
          {
            type: IOutboxEventType.PRODUCT_UPDATED_TOPIC,
            payload: {
              productId: result._id.toString(),
              storeId: result.store.toString(),
              name: result.name,
              description: result.description,
              price: result.price,
              images: result.images,
              isDeleted: result.isDeleted,
              updatedAt: result.updatedAt,
            },
          },
        ],
        { session },
      );
    });
    session.endSession();
    return result;
  }

  async softDeleteProduct(id: string, deletedBy: string) {
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await Product.findByIdAndUpdate(
        id,
        { isDeleted: true, deletedBy, deletedAt: new Date() },
        { session },
      );
      await OutboxEvent.create(
        [
          {
            type: IOutboxEventType.PRODUCT_DELETED_TOPIC,
            payload: { productId: id },
          },
        ],
        { session },
      );
    });
    session.endSession();
    return { message: "Product deleted" };
  }

  async restoreProduct(id: string): Promise<IProduct> {
    return withTransaction(async (session) => {
      const restoredProduct = await this.productRepo.restoreProduct(
        id,
        session,
      );
      if (!restoredProduct) {
        logger.error(`Product with id ${id} not found`);
        throw new Error(`Product with id ${id} not found`);
      }
      return restoredProduct;
    });
  }
}

const defaultProductRepo =
  new (require("../repository/ProductRepository").ProductRepository)();
export default new ProductService(defaultProductRepo);
