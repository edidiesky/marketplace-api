import { IProductRepository } from "../repository/IProductRepository";
import { IProduct } from "../models/Product";
import mongoose, { FilterQuery } from "mongoose";
import { withTransaction } from "../utils/withTransaction";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";
import Product from "../models/Product";

export class ProductService {
  private productRepo: IProductRepository;
  constructor(productRepo: IProductRepository) {
    this.productRepo = productRepo;
  }

  async CreateProductService(
    userId: string,
    body: Partial<IProduct>
  ): Promise<IProduct> {
    return withTransaction(async (session) => {
      const productData = {
        ownerId: new mongoose.Types.ObjectId(userId),
        ...body,
      };

      const product = await this.productRepo.createProduct(productData, session);
      if (!product) {
        throw new Error("Failed to create product");
      }
      return product;
    });
  }

  async getAllProducts(
    query: FilterQuery<IProduct>,
    skip: number,
    limit: number
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
    body: Partial<IProduct>
  ): Promise<IProduct | null> {
    return this.productRepo.updateProduct(id, body);
  }

  async deleteProduct(id: string): Promise<void> {
    return this.productRepo.deleteproductById(id);
  }

  async softDeleteProduct(id: string, deletedBy: string): Promise<IProduct> {
    return withTransaction(async (session) => {
      await this.productRepo.softDeleteProduct(id, deletedBy, session);
      const prod = await this.productRepo.findProductById(id);
      if (!prod) {
        throw new Error(`Product with id ${id} not found after soft delete`);
      }
      return prod;
    });
  }

  async restoreProduct(id: string): Promise<IProduct> {
    return withTransaction(async (session) => {
      const restoredProduct = await this.productRepo.restoreProduct(id, session);
      if (!restoredProduct) {
        throw new Error(`Product with id ${id} not found`);
      }
      return restoredProduct;
    });
  }
}

const defaultProductRepo = new (require("../repository/ProductRepository").ProductRepository)();
export default new ProductService(defaultProductRepo);