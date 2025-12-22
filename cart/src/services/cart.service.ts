import { FilterQuery, Types } from "mongoose";
import Cart, { ICart } from "../models/Cart";
import { withTransaction } from "../utils/connectDB";
import { ICartRepository } from "../repository/ICartRepository";
import { CartRepository } from "../repository/CartRepository";
import logger from "../utils/logger";
import redisClient from "../config/redis";
import { AddToCartRequest } from "../types";
import { SUCCESSFULLY_FETCHED_STATUS_CODE } from "../constants";
export class CartService {
  private CartRepo: ICartRepository;
  private readonly CACHE_TTL = 300;
  private readonly CACHE_PREFIX = "Cart:";
  constructor() {
    this.CartRepo = new CartRepository();
  }

  private getCacheKey(
    userId: string,
    storeId: string,
    version: number
  ): string {
    return `${this.CACHE_PREFIX}${storeId}:${userId}:v${version}`;
  }

  private getLatestVersionKey(userId: string, storeId: string): string {
    return `${this.CACHE_PREFIX}${storeId}:${userId}:latest_version`;
  }

  private async addToCache(
    userId: string,
    storeId: string,
    cart: ICart
  ): Promise<void> {
    const versionKey = this.getCacheKey(userId, storeId, cart.version);
    const latestKey = this.getLatestVersionKey(userId, storeId);

    try {
      await Promise.all([
        redisClient.set(versionKey, JSON.stringify(cart), "EX", this.CACHE_TTL),
        redisClient.set(latestKey, cart.version.toString(), "EX", 86400),
      ]);
      logger.info("Cart cached (versioned)", {
        versionKey,
        version: cart.version,
        latestKey
      });
    } catch (error) {
      logger.warn("Cache write failed", {
        message:
          error instanceof Error
            ? error?.message
            : "An unknown error is writing to the cache occurred",
        stack:
          error instanceof Error
            ? error?.stack
            : "An unknown error is writing to the cache occurred",
      });
    }
  }

  async getCart(userId: string, storeId: string): Promise<ICart | null> {
    const latestKey = this.getLatestVersionKey(userId, storeId);
    let versionStr = await redisClient.get(latestKey);
    let version = versionStr ? parseInt(versionStr, 10) : null;

    if (!version) {
      const doc = await this.CartRepo.cartExists(storeId, userId);
      if (!doc) return null;
      version = doc.version;
      await redisClient.set(latestKey, version.toString(), "EX", 86400);
    }

    const cacheKey = this.getCacheKey(userId, storeId, version);
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.debug("Versioned cache hit", { cacheKey });
      return JSON.parse(cached);
    }

    const cart = await this.CartRepo.cartExists(storeId, userId);
    if (cart) await this.addToCache(userId, storeId, cart);
    return cart;
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
      return "Cart has already been placed";
    }

    return withTransaction(async (session) => {
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

      cart.cartItems = cart.cartItems.filter(
        (item) => !item.productId.equals(new Types.ObjectId(productId))
      );

      cart.cartItems.push({
        productId: new Types.ObjectId(productId),
        productTitle,
        productImage,
        productPrice,
        productQuantity: quantity,
        reservedAt: new Date(),
        productDescription: productDescription || "",
      });

      cart.quantity = cart.cartItems.reduce((s, i) => s + i.productQuantity, 0);
      cart.totalPrice = cart.cartItems.reduce(
        (s, i) => s + i.productPrice * i.productQuantity,
        0
      );

      await cart.save({ session });
      await this.addToCache(userId, storeId, cart);

      return cart;
    });
  }

  async updateCart(
    userId: string,
    storeId: string,
    productId: string,
    quantity: number
  ): Promise<ICart | null> {
    return withTransaction(async (session) => {
      if (quantity <= 0) throw new Error("Quantity must be > 0");

      const cart = await this.getCart(userId, storeId);
      if (!cart) throw new Error("Cart not found");

      const item = cart.cartItems.find((i) =>
        i.productId.equals(new Types.ObjectId(productId))
      );
      if (!item) throw new Error("Item not in cart");

      item.productQuantity = quantity;

      cart.quantity = cart.cartItems.reduce((s, i) => s + i.productQuantity, 0);
      cart.totalPrice = cart.cartItems.reduce(
        (s, i) => s + i.productPrice * i.productQuantity,
        0
      );

      await cart.save({ session });
      await this.addToCache(userId, storeId, cart);

      return cart;
    });
  }

  async deleteCart(
    userId: string,
    storeId: string,
    productId: string
  ): Promise<void> {
    return withTransaction(async (session) => {
      const cart = await this.getCart(userId, storeId);
      if (!cart) throw new Error("Cart not found");

      cart.cartItems = cart.cartItems.filter(
        (i) => !i.productId.equals(new Types.ObjectId(productId))
      );

      cart.quantity = cart.cartItems.reduce((s, i) => s + i.productQuantity, 0);
      cart.totalPrice = cart.cartItems.reduce(
        (s, i) => s + i.productPrice * i.productQuantity,
        0
      );

      await cart.save({ session });
      await this.addToCache(userId, storeId, cart);
    });
  }
}

export const cartService = new CartService();
