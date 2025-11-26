import Product, { IProduct } from "../models/Product";
import { FilterQuery, Types } from "mongoose";
import { withTransaction } from "../utils/withTransaction";
import { ProductRepository } from "../repository/ProductRepository";
import { IProductRepository } from "../repository/IProductRepository";

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
    stores: Promise<IProduct[]>;
    totalCount: number;
    totalPages: number;
  }> {
    const stores = this.productRepo.findAllProduct(query, skip, limit);
    const totalCount = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      stores,
      totalCount,
      totalPages,
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
}

const productService = new ProductService();
export default productService;
