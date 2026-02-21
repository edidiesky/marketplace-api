import { FilterQuery, Types } from "mongoose";
import Cart, { CartItemStatus, ICart } from "../models/Cart";
import { withTransaction } from "../utils/connectDB";
import { ICartRepository } from "../repository/ICartRepository";
import { CartRepository } from "../repository/CartRepository";
import logger from "../utils/logger";
import redisClient from "../config/redis";
import { AddToCartRequest } from "../types";
import { SUCCESSFULLY_FETCHED_STATUS_CODE, CART_ITEM_ADDED_TOPIC } from "../constants";
import { sendCartMessage } from "../messaging/producer";

export class CartService {
  private CartRepo: ICartRepository;
  private readonly CACHE_TTL = 60 * 1;
  private readonly CACHE_PREFIX = "Cart:";
  private readonly LOCK_TTL = 30; 
  private readonly INVENTORY_CACHE_TTL = 60;
  
  constructor() {
    this.CartRepo = new CartRepository();
  }

  private getCacheKey(
    userId: string,
    storeId: string,
    version: number,
  ): string {
    return `${this.CACHE_PREFIX}${storeId}:${userId}:v${version}`;
  }

  private getLatestVersionKey(userId: string, storeId: string): string {
    return `${this.CACHE_PREFIX}${storeId}:${userId}:latest_version`;
  }

  /**
   * Release distributed lock with proper error handling
   */
  private async releaseLock(lockKey: string): Promise<void> {
    try {
      const released = await redisClient.del(lockKey);
      if (released) {
        logger.info("Lock released successfully", { lockKey });
      } else {
        logger.warn("Lock not found during release (may have expired)", { lockKey });
      }
    } catch (error) {
      logger.error("Failed to release lock", {
        lockKey,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Reserve inventory with the inventory service
   */
  private async reserveInventory(
    storeId: string,
    productId: string,
    quantity: number,
    userId: string,
    sagaId: string
  ): Promise<{ success: boolean; availableStock?: number; error?: string }> {
    try {
      const response = await fetch(
        `http://inventory:4008/api/v1/inventories/reserve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId,
            productId,
            quantity,
            userId,
            sagaId,
            reservationType: "cart",
          }),
        }
      );

      const data = await response.json() as {
        availableStock:number,
        message:string,
        reservationId:string
      };

      if (!response.ok) {
        logger.warn("Inventory reservation failed", {
          productId,
          quantity,
          status: response.status,
          data,
        });
        return {
          success: false,
          availableStock: data.availableStock,
          error: data.message || "Reservation failed",
        };
      }

      logger.info("Inventory reserved successfully", {
        productId,
        quantity,
        reservationId: data.reservationId,
      });

      return { success: true };
    } catch (error) {
      logger.error("Failed to reserve inventory", {
        productId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: "Failed to communicate with inventory service",
      };
    }
  }

  /**
   * Release inventory reservation
   */
  private async releaseInventory(
    storeId: string,
    productId: string,
    quantity: number,
    userId: string,
    sagaId: string
  ): Promise<void> {
    try {
      await fetch(`http://inventory:4008/api/v1/inventories/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          productId,
          quantity,
          userId,
          sagaId,
          reservationType: "cart",
        }),
      });

      logger.info("Inventory released successfully", {
        productId,
        quantity,
      });
    } catch (error) {
      logger.error("Failed to release inventory", {
        productId,
        quantity,
        error: error instanceof Error ? error.message : String(error),
      });
     
    }
  }

  /**
   * Invalidate stale inventory cache
   */
  private async invalidateInventoryCache(
    storeId: string,
    productId: string
  ): Promise<void> {
    const cacheKey = `inventory:${storeId}:${productId}`;
    try {
      await redisClient.del(cacheKey);
      logger.info("Invalidated inventory cache", { cacheKey });
    } catch (error) {
      logger.warn("Failed to invalidate inventory cache", {
        cacheKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async addToCache(
    userId: string,
    storeId: string,
    cart: ICart,
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
          this.CACHE_TTL,
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

  async getCartById(id: string): Promise<ICart | null> {
    return this.CartRepo.getSingleCart(id);
  }

  async getAllCarts(
    query: FilterQuery<ICart>,
    skip: number,
    limit: number,
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
   * Create cart with proper inventory reservation and event publishing
   */
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
    const locked = await redisClient.set(lockKey, "1", "EX", this.LOCK_TTL, "NX");
    
    if (!locked) {
      logger.warn("Cart operation already in progress", {
        lockKey,
        userId,
        productId,
      });
      return "Cart operation already in progress";
    }

    const sagaId = `cart-${Date.now()}-${userId}-${productId}`;

    try {
      // FIX: Issue #1 - Reserve inventory first
      const reservationResult = await this.reserveInventory(
        storeId,
        productId,
        quantity,
        userId,
        sagaId
      );

      if (!reservationResult.success) {
        if (reservationResult.availableStock !== undefined) {
          return `Insufficient stock. Only ${reservationResult.availableStock} available.`;
        }
        return reservationResult.error || "Unable to reserve inventory";
      }
      await this.invalidateInventoryCache(storeId, productId);

      const cart = await withTransaction(async (session) => {
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

        // Check if item already exists and release old reservation
        const existingItem = cart.cartItems.find((item) =>
          item.productId.equals(new Types.ObjectId(productId))
        );

        if (existingItem) {
          // Release old reservation before updating
          await this.releaseInventory(
            storeId,
            productId,
            existingItem.productQuantity,
            userId,
            `${sagaId}-old`
          );
        }

        // Remove existing item (will be replaced)
        cart.cartItems = cart.cartItems.filter(
          (item) => !item.productId.equals(new Types.ObjectId(productId)),
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
          0,
        );

        // Update expiry on modification
        cart.expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await cart.save({ session });
        return cart;
      });

      // Update cache after successful transaction
      await this.addToCache(userId, storeId, cart);

      // FIX: Issue #4 - Publish cart event
      try {
        await sendCartMessage(
          CART_ITEM_ADDED_TOPIC,
          {
            cartId: cart._id.toString(),
            userId,
            storeId,
            productId,
            quantity,
            productPrice,
            totalPrice: cart.totalPrice,
            sagaId,
            timestamp: new Date().toISOString(),
          },
          userId
        );
        logger.info("Cart event published", { event: CART_ITEM_ADDED_TOPIC, sagaId });
      } catch (eventError) {
        logger.error("Failed to publish cart event", {
          error: eventError instanceof Error ? eventError.message : String(eventError),
          sagaId,
        });
        // Don't fail the operation if event publishing fails
      }

      return cart;
    } catch (error) {
      // Rollback: Release the reservation
      await this.releaseInventory(storeId, productId, quantity, userId, sagaId);
      
      logger.error("Cart creation failed", {
        userId,
        productId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      // FIX: Issue #2 - Always release lock
      await this.releaseLock(lockKey);
    }
  }

  /**
   * Update cart with inventory adjustments
   */
  async updateCart(
    userId: string,
    storeId: string,
    productId: string,
    quantity: number,
  ) {
    const sagaId = `cart-update-${Date.now()}-${userId}-${productId}`;
    
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
        i.productId.equals(new Types.ObjectId(productId)),
      );
      
      if (!item) {
        logger.error("Item was not found:", {
          userId: new Types.ObjectId(userId),
          storeId: new Types.ObjectId(storeId),
          productId,
        });
        throw new Error("Item not in cart");
      }

      const oldQuantity = item.productQuantity;
      const quantityDiff = quantity - oldQuantity;

      // If increasing quantity, reserve additional inventory
      if (quantityDiff > 0) {
        const reservationResult = await this.reserveInventory(
          storeId,
          productId,
          quantityDiff,
          userId,
          sagaId
        );

        if (!reservationResult.success) {
          throw new Error(
            reservationResult.error || "Unable to reserve additional inventory"
          );
        }
      } 
      // If decreasing quantity, release excess inventory
      else if (quantityDiff < 0) {
        await this.releaseInventory(
          storeId,
          productId,
          Math.abs(quantityDiff),
          userId,
          sagaId
        );
      }

      // Update the cart
      item.productQuantity = quantity;

      cart.quantity = cart.cartItems.reduce((s, i) => s + i.productQuantity, 0);
      cart.totalPrice = cart.cartItems.reduce(
        (s, i) => s + i.productPrice * i.productQuantity,
        0,
      );

      // Update expiry on modification
      cart.expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await cart.save({ session });

      // Invalidate inventory cache and update cart cache
      await Promise.all([
        this.invalidateInventoryCache(storeId, productId),
        this.addToCache(userId, storeId, cart),
      ]);

      return cart;
    });
  }

  /**
   * Delete cart item with inventory release
   */
  async deleteCart(
    userId: string,
    storeId: string,
    productId: string,
  ): Promise<void> {
    const sagaId = `cart-delete-${Date.now()}-${userId}-${productId}`;
    
    return withTransaction(async (session) => {
      const cart = await this.getCart(userId, storeId);
      if (!cart) throw new Error("Cart not found");

      const itemToDelete = cart.cartItems.find((i) =>
        i.productId.equals(new Types.ObjectId(productId))
      );

      if (!itemToDelete) {
        throw new Error("Item not found in cart");
      }

      // Release inventory reservation
      await this.releaseInventory(
        storeId,
        productId,
        itemToDelete.productQuantity,
        userId,
        sagaId
      );

      cart.cartItems = cart.cartItems.filter(
        (i) => !i.productId.equals(new Types.ObjectId(productId)),
      );

      cart.quantity = cart.cartItems.reduce((s, i) => s + i.productQuantity, 0);
      cart.totalPrice = cart.cartItems.reduce(
        (s, i) => s + i.productPrice * i.productQuantity,
        0,
      );

      // Update expiry on modification
      cart.expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await cart.save({ session });

      // Invalidate caches
      await Promise.all([
        this.invalidateInventoryCache(storeId, productId),
        this.addToCache(userId, storeId, cart),
      ]);
    });
  }

  async clearCartById(cartId: string): Promise<void> {
    const cart = await Cart.findById(new Types.ObjectId(cartId));
    
    if (cart) {
      // Release all inventory reservations
      const sagaId = `cart-clear-${Date.now()}-${cartId}`;
      
      for (const item of cart.cartItems) {
        await this.releaseInventory(
          cart.storeId.toString(),
          item.productId.toString(),
          item.productQuantity,
          cart.userId.toString(),
          sagaId
        );
      }
    }

    await Cart.deleteOne({ _id: new Types.ObjectId(cartId) });
  }

  async markItemsUnavailable(
    cartId: string,
    unavailableItems: Array<{ productId: string; reason: string }>,
  ): Promise<void> {
    return withTransaction(async (session) => {
      const cart = await Cart.findById(new Types.ObjectId(cartId)).session(
        session,
      );

      if (!cart) {
        logger.warn("Cart not found when marking items unavailable", {
          cartId,
          event: "cart_not_found_unavailable_items",
        });
        return;
      }

      let updated = false;
      for (const unavailableItem of unavailableItems) {
        const cartItem = cart.cartItems.find((item) =>
          item.productId.equals(new Types.ObjectId(unavailableItem.productId)),
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

        const userId = cart.userId.toString();
        const storeId = cart.storeId.toString();

        try {
          const latestKey = this.getLatestVersionKey(userId, storeId);
          const versionKey = this.getCacheKey(userId, storeId, cart.version);

          await Promise.all([
            redisClient.del(latestKey),
            redisClient.del(versionKey),
          ]);

          logger.info(
            "Cart cache invalidated after marking items unavailable",
            { cartId, userId, storeId },
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
            },
          );
        }
      }
    });
  }
}

export const cartService = new CartService();