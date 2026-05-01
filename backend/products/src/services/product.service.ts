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
      const productData: Partial<IProduct> = {
        ...body,
        ownerId: new mongoose.Types.ObjectId(userId),
      };

      const product = await this.productRepo.createProduct(
        productData,
        session,
      );

      if (!product) {
        logger.error("Failed to create product");
        throw new Error("Failed to create product");
      }

      await OutboxEvent.create(
        [
          {
            type: IOutboxEventType.PRODUCT_ONBOARDING_COMPLETED_TOPIC,
            payload: {
              productId: product._id.toString(),
              storeId: body.store?.toString(),
              ownerId: userId,
              sku:
                body.sku ||
                `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: body.name,
              image: body.images?.[0],
              availableStock: body.availableStock,
              thresholdStock: body.thresholdStock || 10,
              trackInventory: body.trackInventory ?? true,
              category: body.category,
              colors: body.colors,
              size: body.size,
              createdAt: new Date(),
              idempotencyId: `${userId}-${product._id}`,
              storeName: body.storeName,
              storeDomain: body.storeDomain,
              ownerName: body.ownerName,
            },
          },
        ],
        { session },
      );

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

  async updateProduct(
    id: string,
    body: Partial<IProduct>,
  ): Promise<IProduct | null> {
    return withTransaction(async (session) => {
      const result = await this.productRepo.updateProduct(id, body);

      if (!result) return null;

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

      return result;
    });
  }

  /**
   * Soft delete via repository. Sets isDeleted, deletedAt, deletedBy.
   * Emits PRODUCT_DELETED_TOPIC via outbox in the same transaction.
   * Returns the updated product so callers can inspect isDeleted: true.
   */
  async softDeleteProduct(
    id: string,
    deletedBy: string,
  ): Promise<IProduct> {
    return withTransaction(async (session) => {
      await this.productRepo.softDeleteProduct(id, deletedBy, session);

      await OutboxEvent.create(
        [
          {
            type: IOutboxEventType.PRODUCT_DELETED_TOPIC,
            payload: { productId: id },
          },
        ],
        { session },
      );

      const updated = await this.productRepo.findProductById(id);

      if (!updated) {
        throw new Error(`Product with id ${id} not found after soft delete`);
      }

      return updated;
    });
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

  /**
   * Hard delete. Delegates entirely to the repository.
   * No outbox event — hard deletes are admin-only operations
   * and do not need downstream sync since softDelete already
   * propagated isDeleted: true to ES and inventory.
   */
  async deleteProduct(id: string): Promise<void> {
    return this.productRepo.deleteproductById(id);
  }
}

const defaultProductRepo =
  new (require("../repository/ProductRepository").ProductRepository)();
export default new ProductService(defaultProductRepo);