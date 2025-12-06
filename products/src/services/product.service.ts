import Product, { IProduct } from "../models/Product";
import mongoose, { FilterQuery, Types } from "mongoose";
import { withTransaction } from "../utils/withTransaction";
import { ProductRepository } from "../repository/ProductRepository";
import { IProductRepository } from "../repository/IProductRepository";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";

export class ProductService {
  private productRepo: IProductRepository;
  constructor() {
    this.productRepo = new ProductRepository();
  }
  /**
   * @description Create Product method
   * @param userId
   * @param body
   * @returns
   */
  async CreateProductService(
    userId: string,
    body: Partial<IProduct>
  ): Promise<IProduct> {
    return withTransaction(async (session) => {
      const productData = {
        ownerId: new Types.ObjectId(userId),
        ...body,
      };
      const product = await this.productRepo.createProduct(
        productData,
        session
      );
      return product;
    });
  }

  /**
   * @description Get all Product method
   * @param query
   * @param skip
   * @param limit
   * @returns
   */
  async getAllProducts(
    query: FilterQuery<IProduct>,
    skip: number,
    limit: number
  ): Promise<{
    data: {
      products: IProduct[];
      totalCount: number;
      totalPages: number;
    };
    success: boolean;
    statusCode: number;
  }> {
    const products = await this.productRepo.findAllProduct(query, skip, limit);
    const totalCount = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: {
        products,
        totalCount,
        totalPages,
      },
      success: true,
      statusCode: SUCCESSFULLY_FETCHED_STATUS_CODE,
    };
  }

  /**
   * @description Get single Product method
   * @param query id
   * @returns
   */
  async getProductById(id: string): Promise<IProduct | null> {
    return this.productRepo.findProductById(id);
  }

  /**
   * @description update single Product method
   * @param id
   * @param body
   * @returns
   */
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
    const product = await withTransaction(async (session) => {
      await this.productRepo.softDeleteProduct(id, deletedBy, session);
      const prod = await this.productRepo.findProductById(id);
      if (!prod) {
        throw new Error(`Product with id ${id} not found after soft delete`);
      }
      return prod;
    });
    return product;
  }
  async restoreProduct(id: string): Promise<IProduct> {
    return withTransaction(async (session) => {
      const restoredProduct = await this.productRepo.restoreProduct(
        id,
        session
      );
      if (!restoredProduct) {
        throw new Error(`Product with id ${id} not found`);
      }
      return restoredProduct as IProduct;
    });
  }
}

const productService = new ProductService();
export default productService;
