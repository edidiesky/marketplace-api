import mongoose, { FilterQuery, Types } from "mongoose";
import Cart, { ICart } from "../models/Cart";
import { withTransaction } from "../utils/connectDB";
import { ICartRepository } from "../repository/ICartRepository";
import { CartRepository } from "../repository/CartRepository";
import logger from "../utils/logger";
import redisClient from "../config/redis";
import { AddToCartRequest } from "../types";
import {
  BASE_EXPIRATION_SEC,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";

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
      logger.info("Added Cart to cache", {
        key: this.getCacheKey(userId),
        userId,
      });
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
    request: AddToCartRequest
  ): Promise<ICart | string> {
    const {
      productId,
      idempotencyKey,
      productTitle,
      productImage,
      productPrice,
      productDescription,
      quantity = 1,
      fullName,
      email,
      storeId,
    } = request;

    const lockKey = `cart:add:${storeId}:${userId}:${idempotencyKey}`;
    const locked = await redisClient.set(lockKey, "1", "EX", 600, "NX");

    if (!locked) {
      logger.info("Duplicate request blocked by idempotency key", {
        userId,
        productId,
        idempotencyKey,
      });
      return "Cart has already been placed";
    }

    try {
      return await withTransaction(async (session) => {
        let cart = await Cart.findOne({
          userId: new Types.ObjectId(userId),
          storeId: new Types.ObjectId(storeId),
        }).session(session);

        if (!cart) {
          cart = new Cart({
            userId: new Types.ObjectId(userId),
            storeId: new Types.ObjectId(storeId),
            fullName: fullName || "",
            email: email || "",
            cartItems: [],
            quantity: 0,
            totalPrice: 0,
            expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
        }

        // Remove existing item (so we replace, update, not duplicate)
        cart.cartItems = cart.cartItems.filter(
          (item) => !item.productId.equals(new Types.ObjectId(productId))
        );

        // Add/update item
        cart.cartItems.push({
          productId: new Types.ObjectId(productId),
          productTitle,
          productImage,
          productPrice,
          productQuantity: quantity,
          reservedAt: new Date(),
          productDescription: productDescription || "",
        });

        // Recalculate totals
        cart.quantity = cart.cartItems.reduce(
          (sum, i) => sum + i.productQuantity,
          0
        );
        cart.totalPrice = cart.cartItems.reduce(
          (sum, i) => sum + i.productPrice * i.productQuantity,
          0
        );

        await cart.save({ session });

        await this.addToCache(`${userId}:${storeId}`, cart);

        logger.info("Cart updated successfully", {
          cartId: cart._id,
          userId,
          storeId,
          productId,
          quantity,
        });

        return cart;
      });
    } catch (error) {
      logger.error("Cart creation failed", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        productId,
        idempotencyKey,
      });
      throw error;
    }
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
    data: {
      carts: ICart[] | null;
      totalCount: number;
      totalPages: number;
    };
    success: boolean;
    statusCode: number;
  }> {
    const [carts, totalCount] = await Promise.all([
      this.CartRepo.getStoreCart(query, skip, limit),
      Cart.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: {
        carts,
        totalCount,
        totalPages,
      },
      success: true,
      statusCode: SUCCESSFULLY_FETCHED_STATUS_CODE,
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
    storeId: string,
    productId: string,
    quantity: number
  ): Promise<ICart | null> {
    const cart = withTransaction(async (session) => {
      if (quantity <= 0) {
        logger.error("Quantity must be greater than zero", {
          productId,
          quantity,
          userId,
        });
        await this.deleteCart(userId, productId);
        throw new Error("Quantity must be greater than zero");
      }
      // const product = await ProductReadService.getProductForCart(productId);
      // if (!product) {
      //   logger.error("Product not found", { productId });
      //   await session.abortTransaction();
      //   throw new Error("Product not found");
      // }
      // const isInStock = await ProductReadService.checkStock(
      //   productId,
      //   quantity
      // );
      // if (!isInStock) {
      //   logger.error("Insufficient stock for product", { productId, quantity });
      //   await session.abortTransaction();
      //   throw new Error("Insufficient stock for the requested product");
      // }storeId
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
        (acc, item) => acc + item.productPrice * item.productQuantity,
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
    });
  }
}

export const cartService = new CartService();
