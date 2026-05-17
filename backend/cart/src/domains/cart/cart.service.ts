import mongoose, { Types } from "mongoose";
import { cartRepository }    from "./cart.repository";
import { AppError }          from "../../utils/AppError";
import logger                from "../../utils/logger";
import redisClient           from "../../config/redis";
import {
  SERVICE_NAME,
  LOCK_TTL_SEC,
  CART_TTL_DAYS,
  getJitter,
  MAX_RETRIES,
  BASE_DELAY_MS,
} from "../../constants";
import { requestContext }    from "../../context/requestContext";
import { CartItemStatus, ICart } from "./cart.model";
import {
  AddToCartDto,
  CartItemResponseDto,
  CartListResponseDto,
  CartResponseDto,
  UpdateCartItemDto,
} from "./cart.dto";

function toItemDto(item: ICart["cartItems"][number]): CartItemResponseDto {
  return {
    productId:           item.productId.toString(),
    productTitle:        item.productTitle,
    productDescription:  item.productDescription,
    productPrice:        item.productPrice,
    productQuantity:     item.productQuantity,
    productImage:        item.productImage,
    reservedAt:          item.reservedAt,
    availabilityStatus:  item.availabilityStatus,
    unavailabilityReason: item.unavailabilityReason,
  };
}

function toDto(cart: ICart): CartResponseDto {
  return {
    cartId:     cart._id.toString(),
    userId:     cart.userId.toString(),
    sellerId:   cart.sellerId.toString(),
    storeId:    cart.storeId.toString(),
    fullName:   cart.fullName,
    email:      cart.email,
    quantity:   cart.quantity,
    totalPrice: cart.totalPrice,
    cartItems:  cart.cartItems.map(toItemDto),
    expireAt:   cart.expireAt,
    version:    cart.version,
    createdAt:  cart.createdAt,
    updatedAt:  cart.updatedAt,
  };
}

function computeExpireAt(): Date {
  return new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function computeTotals(cartItems: ICart["cartItems"]): {
  quantity:   number;
  totalPrice: number;
} {
  const quantity   = cartItems.reduce((s, i) => s + i.productQuantity, 0);
  const totalPrice = Math.round(
    cartItems.reduce((s, i) => s + i.productPrice * i.productQuantity, 0) * 100
  ) / 100;
  return { quantity, totalPrice };
}

export const cartService = {
  async addToCart(dto: AddToCartDto): Promise<CartResponseDto> {
    const {
      userId,
      storeId,
      sellerId,
      productId,
      productTitle,
      productImage,
      productPrice,
      productDescription,
      quantity,
      fullName,
      email,
      idempotencyKey,
    } = dto;

    const lockKey = `cart:add:${storeId}:${userId}:${productId}:${idempotencyKey ?? ""}`;
    const locked  = await redisClient.set(
      lockKey,
      "1",
      "EX",
      LOCK_TTL_SEC,
      "NX"
    );

    if (!locked) {
      throw AppError.conflict(
        "Cart operation already in progress. Please retry."
      );
    }

    try {
      const session = await mongoose.startSession();
      let cart!: ICart;

      await session.withTransaction(async () => {
        let cartDoc = await Cart.findOne({
          userId:  new Types.ObjectId(userId),
          storeId: new Types.ObjectId(storeId),
        }).session(session);

        if (!cartDoc) {
          cartDoc = new Cart({
            userId:     new Types.ObjectId(userId),
            storeId:    new Types.ObjectId(storeId),
            sellerId:   new Types.ObjectId(sellerId),
            fullName,
            email,
            cartItems:  [],
            quantity:   0,
            totalPrice: 0,
            expireAt:   computeExpireAt(),
          });
        }

        cartDoc.cartItems = cartDoc.cartItems.filter(
          (item) => !item.productId.equals(new Types.ObjectId(productId))
        );

        cartDoc.cartItems.push({
          productId:          new Types.ObjectId(productId),
          productTitle,
          productImage,
          productPrice,
          productQuantity:    quantity,
          productDescription: productDescription ?? "",
          reservedAt:         new Date(),
          availabilityStatus: CartItemStatus.AVAILABLE,
        });

        const totals       = computeTotals(cartDoc.cartItems);
        cartDoc.quantity   = totals.quantity;
        cartDoc.totalPrice = totals.totalPrice;
        cartDoc.expireAt   = computeExpireAt();

        await cartDoc.save({ session });
        cart = cartDoc;
      });

      session.endSession();

      await cartRepository.writeUserCartCache(userId, storeId, cart);

      requestContext.set({ eventType: "cart.item.added" });

      logger.info("cart_item_added", {
        event:     "cart_item_added",
        service:   SERVICE_NAME,
        cartId:    cart._id.toString(),
        userId,
        storeId,
        productId,
        requestId: requestContext.get()?.requestId,
      });

      return toDto(cart);
    } finally {
      await redisClient.del(lockKey);
    }
  },

  async getCart(
    userId:  string,
    storeId: string
  ): Promise<CartResponseDto> {
    const cached = await cartRepository.findByUserAndStore(userId, storeId);
    if (!cached) throw AppError.notFound("Cart not found.");
    return toDto(cached);
  },

  async getCartById(cartId: string): Promise<CartResponseDto> {
    const cart = await cartRepository.findById(cartId);
    if (!cart) throw AppError.notFound("Cart not found.");
    return toDto(cart);
  },

  async getAllStoreCarts(
    storeId: string,
    page:    number,
    limit:   number
  ): Promise<CartListResponseDto> {
    const skip  = (page - 1) * limit;
    const query = { storeId: new Types.ObjectId(storeId) };

    const [carts, total] = await Promise.all([
      cartRepository.findAll(query, skip, limit),
      cartRepository.count(query),
    ]);

    return {
      carts:      carts.map(toDto),
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  },

  async updateCartItem(dto: UpdateCartItemDto): Promise<CartResponseDto> {
    const { userId, storeId, productId, quantity } = dto;

    const session = await mongoose.startSession();
    let cart!: ICart;

    await session.withTransaction(async () => {
      const cartDoc = await Cart.findOne({
        userId:  new Types.ObjectId(userId),
        storeId: new Types.ObjectId(storeId),
      }).session(session);

      if (!cartDoc) throw AppError.notFound("Cart not found.");

      const item = cartDoc.cartItems.find((i) =>
        i.productId.equals(new Types.ObjectId(productId))
      );
      if (!item) throw AppError.notFound("Item not found in cart.");

      item.productQuantity = quantity;

      const totals       = computeTotals(cartDoc.cartItems);
      cartDoc.quantity   = totals.quantity;
      cartDoc.totalPrice = totals.totalPrice;

      await cartDoc.save({ session });
      cart = cartDoc;
    });

    session.endSession();

    await cartRepository.writeUserCartCache(userId, storeId, cart);

    logger.info("cart_item_updated", {
      event:     "cart_item_updated",
      service:   SERVICE_NAME,
      cartId:    cart._id.toString(),
      userId,
      storeId,
      productId,
      quantity,
      requestId: requestContext.get()?.requestId,
    });

    return toDto(cart);
  },

  async deleteCartItem(
    userId:    string,
    storeId:   string,
    productId: string
  ): Promise<void> {
    const session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const cartDoc = await Cart.findOne({
        userId:  new Types.ObjectId(userId),
        storeId: new Types.ObjectId(storeId),
      }).session(session);

      if (!cartDoc) throw AppError.notFound("Cart not found.");

      const initialLength  = cartDoc.cartItems.length;
      cartDoc.cartItems    = cartDoc.cartItems.filter(
        (i) => !i.productId.equals(new Types.ObjectId(productId))
      );

      if (cartDoc.cartItems.length === initialLength) {
        throw AppError.notFound("Item not found in cart.");
      }

      const totals       = computeTotals(cartDoc.cartItems);
      cartDoc.quantity   = totals.quantity;
      cartDoc.totalPrice = totals.totalPrice;

      await cartDoc.save({ session });
    });

    session.endSession();

    await cartRepository.invalidateUserCartCache(userId, storeId);

    logger.info("cart_item_deleted", {
      event:     "cart_item_deleted",
      service:   SERVICE_NAME,
      userId,
      storeId,
      productId,
      requestId: requestContext.get()?.requestId,
    });
  },

  async clearCartByStoreId(storeId: string): Promise<void> {
    const cart = await cartRepository.deleteByStoreId(storeId);
    if (!cart) return;

    await cartRepository.invalidateUserCartCache(
      cart.userId.toString(),
      storeId
    );

    logger.info("cart_cleared_by_store", {
      event:   "cart_cleared_by_store",
      service: SERVICE_NAME,
      storeId,
      cartId:  cart._id.toString(),
    });
  },

  async clearCartById(cartId: string): Promise<void> {
    const cart = await cartRepository.findById(cartId);
    if (!cart) return;

    await cartRepository.deleteById(cartId);
    await cartRepository.invalidateUserCartCache(
      cart.userId.toString(),
      cart.storeId.toString()
    );

    logger.info("cart_cleared_by_id", {
      event:   "cart_cleared_by_id",
      service: SERVICE_NAME,
      cartId,
    });
  },

  async markItemsUnavailable(
    cartId:           string,
    unavailableItems: Array<{ productId: string; reason: string }>
  ): Promise<void> {
    const session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const cart = await cartRepository.markItemsUnavailable(
        cartId,
        unavailableItems,
        session
      );
      if (!cart) return;

      await cartRepository.invalidateUserCartCache(
        cart.userId.toString(),
        cart.storeId.toString()
      );
    });

    session.endSession();

    logger.info("cart_items_marked_unavailable", {
      event:     "cart_items_marked_unavailable",
      service:   SERVICE_NAME,
      cartId,
      itemCount: unavailableItems.length,
      requestId: requestContext.get()?.requestId,
    });
  },
};

import Cart from "./cart.model";