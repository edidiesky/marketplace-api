import mongoose, { FilterQuery, Types } from "mongoose";
import Cart, { ICart } from "../models/Cart";
import { withTransaction } from "../utils/connectDB";
import { ICartRepository } from "../repository/ICartRepository";
import { CartRepository } from "../repository/CartRepository";
import { ProductReadService } from "./product.service";
import logger from "../utils/logger";
import redisClient from "../config/redis";
export class CartService {
  private CartRepo: ICartRepository;
  private readonly CACHE_TTL = 300;
  private readonly CACHE_PREFIX = "Cart:";
  constructor() {
    this.CartRepo = new CartRepository();
  }

  private getCacheKey(userId: string): string {
    return `${this.CACHE_PREFIX}:${userId}`;
  }

  private getSearchCacheKey(query: any, skip: number, limit: number): string {
    return `${this.CACHE_PREFIX}:search:${JSON.stringify({
      query,
      skip,
      limit,
    })}`;
  }

  private async invalidateSearchCaches(): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}:search:*`;
      const keys = await redisClient.keys(pattern);

      if (keys.length > 0) {
        await redisClient.del(...keys);
        logger.info("Invalidated Cart search caches", {
          count: keys.length,
        });
      }
    } catch (error) {
      logger.error("Failed to invalidate search caches", { error });
    }
  }

  /**
   * @description Add Cart to cache method
   * @param userId
   * @param data
   */
  private async addToCache(userId: string, data: any): Promise<void> {
    try {
      await redisClient.set(
        this.getCacheKey(userId),
        JSON.stringify(data),
        "EX",
        this.CACHE_TTL
      );
      logger.info("Added Cart to cache", { key: this.getCacheKey(userId) });
    } catch (error) {
      logger.warn("Cache write failed", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "Unknown error",
        key: this.getCacheKey(userId),
      });
    }
  }

  /**
   * @description Create Cart method
   * @param userId
   * @param body
   * @returns
   */
  async createCart(
    userId: string,
    productId: string,
    quantity: number,
    body: Partial<ICart>
  ): Promise<ICart> {
    return withTransaction(async (session) => {
      const product = await ProductReadService.getProductForCart(productId);
      if (!product) {
        logger.error("Product not found", { productId });
        await session.abortTransaction();
        throw new Error("Product not found");
      }
      const isInStock = await ProductReadService.checkStock(
        productId,
        quantity
      );
      if (!isInStock) {
        logger.error("Insufficient stock for product", { productId, quantity });
        await session.abortTransaction();
        throw new Error("Insufficient stock for the requested product");
      }

      // check if carte already exists for user and product
      let cartExists = await this.CartRepo.cartExists(productId, userId);
      if (!cartExists) {
        const [newcart] = await Cart.create(
          [
            {
              cartItems: [],
              userId: new Types.ObjectId(userId),
              fullName: body.fullName || "",
              email: body.email || "",
              quantity: 0,
              totalPrice: 0,
            },
          ],
          { session }
        );

        cartExists = newcart;
        logger.info("Creating new cart item", {
          productId,
          userId,
          cartExists,
        });
      }

      // remove existing items
      cartExists.cartItems = cartExists.cartItems.filter(
        (item) => !item.productId.equals(new Types.ObjectId(productId))
      );

      cartExists.cartItems.push({
        productId: new Types.ObjectId(productId),
        productTitle: product.title,
        productImage: product.images,
        productPrice: product.price,
        productQuantity: body.quantity || 0,
        reservedAt: new Date(),
        productDescription: product.description,
      });

      cartExists.quantity = cartExists.cartItems.reduce(
        (acc, item) => acc + item.productQuantity,
        0
      );
      cartExists.totalPrice = cartExists.cartItems.reduce(
        (acc, item) => acc + item.productPrice * item.productQuantity,
        0
      );
      await cartExists.save({ session });
      logger.info("Cart item added/updated successfully", {
        productId,
        userId,
        cartId: cartExists?._id,
      });
      return cartExists;
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
    userId: string,
    productId: string,
    quantity: number
  ): Promise<ICart | null> {
    const cart = withTransaction(async (session) => {
      if (quantity <= 0) {
        logger.error("Quantity must be greater than zero", {
          productId,
          quantity,
        });
        await this.deleteCart(userId, productId);
        throw new Error("Quantity must be greater than zero");
      }
      const product = await ProductReadService.getProductForCart(productId);
      if (!product) {
        logger.error("Product not found", { productId });
        await session.abortTransaction();
        throw new Error("Product not found");
      }
      const isInStock = await ProductReadService.checkStock(
        productId,
        quantity
      );
      if (!isInStock) {
        logger.error("Insufficient stock for product", { productId, quantity });
        await session.abortTransaction();
        throw new Error("Insufficient stock for the requested product");
      }
      const cart = await this.CartRepo.cartExists(productId, userId);
      if (!cart) {
        logger.error("Cart not found for user and product", {
          productId,
          userId,
        });
        await session.abortTransaction();
        throw new Error("Cart not found for the specified user and product");
      }

      // find the item in the cart
      const item = cart.cartItems.find((item) =>
        item.productId.equals(new Types.ObjectId(productId))
      )!;

      item.productQuantity = quantity;

      cart.quantity = cart.cartItems.reduce(
        (acc, item) => acc + item.productQuantity,
        0
      );
      cart.totalPrice = cart.cartItems.reduce(
        (acc, item) => acc + item.productPrice * quantity,
        0
      );

      await cart.save({ session });
      this.addToCache(userId, cart);
      logger.info("Cart item updated successfully", {
        productId,
        userId,
        cartId: cart?._id,
      });
      return cart;
    });
    return cart;
  }

  async deleteCart(userId: string, id: string): Promise<void> {
    return withTransaction(async (session) => {
      const cart = await this.CartRepo.cartExists(id, userId);
      if (!cart) {
        logger.error("Cart not found for user and product", {
          id,
          userId,
        });
        await session.abortTransaction();
        throw new Error("Cart not found for the specified user and product");
      }
      cart.cartItems = cart.cartItems.filter(
        (item) => !item.productId.equals(new Types.ObjectId(id))
      );
      cart.quantity = cart.cartItems.reduce(
        (acc, item) => acc + item.productQuantity,
        0
      );
      cart.totalPrice = cart.cartItems.reduce(
        (acc, item) => acc + item.productPrice * item.productQuantity,
        0
      );
      await cart.save({ session });
      this.addToCache(userId, cart);
      logger.info("Cart item deleted successfully", {
        id,
        userId,
        cartId: cart?._id,
      });
      return cart;
    });
  }
}

export const cartService = new CartService();
