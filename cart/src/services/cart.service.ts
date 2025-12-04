import mongoose, { FilterQuery, Types } from "mongoose";
import Cart, { ICart } from "../models/Cart";
import { withTransaction } from "../utils/connectDB";
import { ICartRepository } from "../repository/ICartRepository";
import { CartRepository } from "../repository/CartRepository";
export class CartService {
  private CartRepo: ICartRepository;
  constructor() {
    this.CartRepo = new CartRepository();
  }
  /**
   * @description Create Cart method
   * @param userId
   * @param body
   * @returns
   */
  async createCart(
    userId: string,
    body: Partial<ICart>
  ): Promise<ICart> {
    return withTransaction(async (session) => {
      const CartData = {
        ...body,
        ownerId: new Types.ObjectId(userId),
      };

      const Cart = await this.CartRepo.createCart(
        CartData,
        session
      );
      return Cart;
    });
  }

  /**
   * @description Get all Cart method
   * @param query
   * @param skip
   * @param limit
   * @returns
   */
  async getAllCarts(
    query: FilterQuery<ICart>,
    skip: number,
    limit: number
  ): Promise<{
    Carts: Promise<ICart[] | null>;
    totalCount: number;
    totalPages: number;
  }> {
    const Carts = this.CartRepo.getStoreCart(query, skip, limit);
    const totalCount = await Cart.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      Carts,
      totalCount,
      totalPages,
    };
  }

  /**
   * @description Get single Cart method
   * @param query id
   * @returns
   */
  async getCartById(id: string): Promise<ICart | null> {
    return this.CartRepo.getSingleCart(id);
  }

  /**
   * @description update single Cart method
   * @param id
   * @param body
   * @returns
   */
  async updateCart(
    id: string,
    body: Partial<ICart>
  ): Promise<ICart | null> {
    return this.CartRepo.updateCart(body, id);
  }

  async deleteCart(id: string): Promise<void> {
    return this.CartRepo.deleteCart(id);
  }
}

export const cartService = new CartService();
