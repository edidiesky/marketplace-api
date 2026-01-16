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
  private readonly CACHE_TTL = 60 * 1;
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
        redisClient.set(
          latestKey,
          cart.version.toString(),
          "EX",
          this.CACHE_TTL
        ),
      ]);
      logger.info("Cart cached (versioned)", {
        versionKey,
        version: cart.version,
        latestKey,
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
      await redisClient.set(latestKey, version.toString(), "EX", 86400, "NX");
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
      productTitle,
      productImage,
      productPrice,
      productDescription,
      quantity = 1,
      fullName,
      email,
      storeId,
      sellerId,
    } = request;
    const cacheKey = `inventory:${storeId}:${productId}`;
    let availableStock: number | null = null;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        availableStock = parseInt(cached, 10);
        logger.info("Inventory cache hit in cart service", {
          productId,
          availableStock,
        });
      }
    } catch (err) {
      logger.warn("Redis read failed, will call inventory service", { err });
    }

    if (availableStock === null) {
      try {
        const response = await fetch(
          `http://inventory:4008/api/v1/inventories/check/${productId}?storeId=${storeId}`
        );
        const data = (await response.json()) as {
          quantityAvailable: number;
        };
        availableStock = data?.quantityAvailable;
        await redisClient.set(cacheKey, availableStock.toString(), "EX", 300);
        logger.info("Fetched inventory from inventory service", {
          productId,
          availableStock,
        });
      } catch (err) {
        logger.error("Failed to check inventory", {
          productId,
          message: err instanceof Error ? err.message : String(err),
        });
        throw new Error("Unable to verify stock availability");
      }
    }

    // 3. Check if enough stock
    if (availableStock < quantity) {
      return `Insufficient stock. Only ${availableStock} available.`;
    }

    // 4. Proceed with cart creation
    const lockKey = `cart:add:${storeId}:${userId}:${productId}:${request.idempotencyKey}`;
    const locked = await redisClient.set(lockKey, "1", "EX", 600, "NX");
    if (!locked) {
      return "Cart operation already in progress";
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
          sellerId: new Types.ObjectId(sellerId),
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
        availabilityStatus: CartItemStatus.AVAILABLE,
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
  ) {
    return withTransaction(async (session) => {
      const cart = await Cart.findOne({
        userId: new Types.ObjectId(userId),
        storeId: new Types.ObjectId(storeId),
      }).session(session);
      if (!cart) {
        logger.error("cart was not found:", {
          userId: new Types.ObjectId(userId),
          storeId: new Types.ObjectId(storeId),
          productId,
        });
        throw new Error("Cart not found");
      }

      const item = cart.cartItems.find((i) =>
        i.productId.equals(new Types.ObjectId(productId))
      );
      if (!item) {
        logger.error("Item was not found:", {
          userId: new Types.ObjectId(userId),
          storeId: new Types.ObjectId(storeId),
          productId,
        });
        throw new Error("Item not in cart");
      }

      item.productQuantity = quantity;

      cart.quantity = cart.cartItems.reduce((s, i) => s + i.productQuantity, 0);
      cart.totalPrice = cart.cartItems.reduce(
        (s, i) => s + i.productPrice * i.productQuantity,
        0
      );

      await cart.save({ session });

      // After commit, update cache
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

  async clearCartById(cartId: string): Promise<void> {
    await Cart.deleteOne({ _id: new Types.ObjectId(cartId) });
  }

  async markItemsUnavailable(
    cartId: string,
    unavailableItems: Array<{ productId: string; reason: string }>
  ): Promise<void> {
    return withTransaction(async (session) => {
      const cart = await Cart.findById(new Types.ObjectId(cartId)).session(
        session
      );

      if (!cart) {
        logger.warn("Cart not found when marking items unavailable", {
          cartId,
          event: "cart_not_found_unavailable_items",
        });
        return;
      }

      // Mar
      let updated = false;
      for (const unavailableItem of unavailableItems) {
        const cartItem = cart.cartItems.find((item) =>
          item.productId.equals(new Types.ObjectId(unavailableItem.productId))
        );

        if (cartItem) {
          cartItem.availabilityStatus = CartItemStatus.OUT_OF_STOCK;
          cartItem.unavailabilityReason = unavailableItem.reason;
          updated = true;

          logger.info("Cart item marked as unavailable", {
            cartId,
            productId: unavailableItem.productId,
            reason: unavailableItem.reason,
            event: "cart_item_marked_unavailable",
          });
        }
      }

      if (updated) {
        await cart.save({ session });

        // Invalidate cache after transaction commits
        const userId = cart.userId.toString();
        const storeId = cart.storeId.toString();

        try {
          // Invalidate version cache
          const latestKey = this.getLatestVersionKey(userId, storeId);
          const versionKey = this.getCacheKey(userId, storeId, cart.version);

          await Promise.all([
            redisClient.del(latestKey),
            redisClient.del(versionKey),
          ]);

          logger.info(
            "Cart cache invalidated after marking items unavailable",
            {
              cartId,
              userId,
              storeId,
            }
          );
        } catch (cacheErr) {
          logger.warn(
            "Failed to invalidate cache after marking items unavailable",
            {
              cartId,
              error:
                cacheErr instanceof Error
                  ? cacheErr.message
                  : "Unknown cache error",
            }
          );
        }
      }
    });
  }
}

export const cartService = new CartService();
