import { FilterQuery, Types } from "mongoose";
import Cart, { CartItemStatus, ICart } from "../models/Cart";
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
  private readonly LOCK_TTL = 10;

  constructor() {
    this.CartRepo = new CartRepository();
  }

  private getCacheKey(userId: string, storeId: string): string {
    return `${this.CACHE_PREFIX}${storeId}:${userId}`;
  }

  private async writeCache(
    userId: string,
    storeId: string,
    cart: ICart,
  ): Promise<void> {
    try {
      await redisClient.set(
        this.getCacheKey(userId, storeId),
        JSON.stringify(cart),
        "EX",
        this.CACHE_TTL,
      );
    } catch (err) {
      logger.warn("Cache write failed", { userId, storeId });
    }
  }

  private async invalidateCache(
    userId: string,
    storeId: string,
  ): Promise<void> {
    try {
      await redisClient.del(this.getCacheKey(userId, storeId));
    } catch (err) {
      logger.warn("Cache invalidation failed", { userId, storeId });
    }
  }

  async getCart(userId: string, storeId: string): Promise<ICart | null> {
    const cacheKey = this.getCacheKey(userId, storeId);

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      logger.warn("Cache read failed", { userId, storeId });
    }

    const cart = await this.CartRepo.cartExists(storeId, userId);
    if (cart) await this.writeCache(userId, storeId, cart);
    return cart;
  }

  async getCartById(id: string): Promise<ICart | null> {
    return this.CartRepo.getSingleCart(id);
  }

  async getAllCarts(query: FilterQuery<ICart>, skip: number, limit: number) {
    const [carts, totalCount] = await Promise.all([
      this.CartRepo.getStoreCart(query, skip, limit),
      Cart.countDocuments(query),
    ]);
    return {
      data: { carts, totalCount, totalPages: Math.ceil(totalCount / limit) },
      success: true,
      statusCode: SUCCESSFULLY_FETCHED_STATUS_CODE,
    };
  }

  async createCart(
    userId: string,
    request: AddToCartRequest,
  ): Promise<ICart | string> {
    const {
      productId,
      productTitle,
      productImage,
      productPrice,
      productDescription,
      quantity = 1,
      fullName,
      email,
      storeId,
      sellerId,
      idempotencyKey,
    } = request;

    const lockKey = `cart:add:${storeId}:${userId}:${productId}:${idempotencyKey}`;
    const locked = await redisClient.set(
      lockKey,
      "1",
      "EX",
      this.LOCK_TTL,
      "NX",
    );
    if (!locked) return "Cart operation already in progress";

    try {
      const cart = await withTransaction(async (session) => {
        let cartDoc = await Cart.findOne({
          userId: new Types.ObjectId(userId),
          storeId: new Types.ObjectId(storeId),
        }).session(session);

        if (!cartDoc) {
          cartDoc = new Cart({
            userId: new Types.ObjectId(userId),
            storeId: new Types.ObjectId(storeId),
            sellerId: new Types.ObjectId(sellerId),
            fullName: fullName ?? "",
            email: email ?? "",
            cartItems: [],
            quantity: 0,
            totalPrice: 0,
            expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });
        }

        cartDoc.cartItems = cartDoc.cartItems.filter(
          (item) => !item.productId.equals(new Types.ObjectId(productId)),
        );

        cartDoc.cartItems.push({
          productId: new Types.ObjectId(productId),
          productTitle,
          productImage,
          productPrice,
          productQuantity: quantity,
          productDescription: productDescription ?? "",
          reservedAt: new Date(),
          availabilityStatus: CartItemStatus.AVAILABLE,
        });

        cartDoc.quantity = cartDoc.cartItems.reduce(
          (s, i) => s + i.productQuantity,
          0,
        );
        let totalPrice = cartDoc.cartItems.reduce(
          (s, i) => s + i.productPrice * i.productQuantity,
          0,
        );
        cartDoc.totalPrice = Math.round((totalPrice * 100) / 100);
        cartDoc.expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await cartDoc.save({ session });
        return cartDoc;
      });

      await this.writeCache(userId, storeId, cart);
      return cart;
    } finally {
      await redisClient.del(lockKey);
    }
  }

  async updateCart(
    userId: string,
    storeId: string,
    productId: string,
    quantity: number,
  ): Promise<ICart | null> {
    const cart = await withTransaction(async (session) => {
      const cartDoc = await Cart.findOne({
        userId: new Types.ObjectId(userId),
        storeId: new Types.ObjectId(storeId),
      }).session(session);

      if (!cartDoc) {
        logger.warn("Item not found in cart", {
          userId,
          storeId,
          productId,
          quantity,
        });
        throw new Error("Item not found in cart");
      }

      const item = cartDoc.cartItems.find((i) =>
        i.productId.equals(new Types.ObjectId(productId)),
      );
      if (!item) {
        logger.warn("Item not found in cart", {
          userId,
          storeId,
          productId,
          quantity,
        });
        throw new Error("Item not found in cart");
      }

      item.productQuantity = quantity;
      cartDoc.quantity = cartDoc.cartItems.reduce(
        (s, i) => s + i.productQuantity,
        0,
      );
      let totalPrice = cartDoc.cartItems.reduce(
        (s, i) => s + i.productPrice * i.productQuantity,
        0,
      );
      cartDoc.totalPrice = Math.round((totalPrice * 100) / 100);

      await cartDoc.save({ session });
      return cartDoc;
    });

    await this.writeCache(userId, storeId, cart);
    return cart;
  }

  async deleteCartItem(
    userId: string,
    storeId: string,
    productId: string,
  ): Promise<void> {
    await withTransaction(async (session) => {
      const cartDoc = await Cart.findOne({
        userId: new Types.ObjectId(userId),
        storeId: new Types.ObjectId(storeId),
      }).session(session);

      if (!cartDoc) {
        logger.warn("Item not found in cart", {
          userId,
          storeId,
          productId,
        });
        throw new Error("Item not found in cart");
      }

      cartDoc.cartItems = cartDoc.cartItems.filter(
        (i) => !i.productId.equals(new Types.ObjectId(productId)),
      );

      cartDoc.quantity = cartDoc.cartItems.reduce(
        (s, i) => s + i.productQuantity,
        0,
      );
      cartDoc.totalPrice = cartDoc.cartItems.reduce(
        (s, i) => s + i.productPrice * i.productQuantity,
        0,
      );

      await cartDoc.save({ session });
    });

    await this.invalidateCache(userId, storeId);
  }

  async clearCartById(cartId: string): Promise<void> {
    const cart = await Cart.findById(new Types.ObjectId(cartId));
    if (!cart) return;

    await Cart.deleteOne({ _id: new Types.ObjectId(cartId) });
    await this.invalidateCache(cart.userId.toString(), cart.storeId.toString());

    logger.info("Cart cleared", { cartId });
  }

  async clearCartByStoreId(storeId:string): Promise<void> {
    const cart = await Cart.findOne({
      storeId: new Types.ObjectId(storeId)
    });
    if (!cart) return;

    await Cart.deleteOne({ storeId: new Types.ObjectId(storeId) });
    await this.invalidateCache(cart.userId.toString(), cart.storeId.toString());

    logger.info("Cart cleared", { storeId });
  }

  async markItemsUnavailable(
    cartId: string,
    unavailableItems: Array<{ productId: string; reason: string }>,
  ): Promise<void> {
    await withTransaction(async (session) => {
      const cart = await Cart.findById(new Types.ObjectId(cartId)).session(
        session,
      );
      if (!cart) return;

      for (const { productId, reason } of unavailableItems) {
        const item = cart.cartItems.find((i) =>
          i.productId.equals(new Types.ObjectId(productId)),
        );
        if (item) {
          item.availabilityStatus = CartItemStatus.OUT_OF_STOCK;
          item.unavailabilityReason = reason;
        }
      }

      await cart.save({ session });
      await this.invalidateCache(
        cart.userId.toString(),
        cart.storeId.toString(),
      );
    });
  }
}

export const cartService = new CartService();
