import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import {
  BAD_REQUEST_STATUS_CODE,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
  NOT_FOUND_STATUS_CODE,
} from "../constants";
import { AuthenticatedRequest } from "../types";
import { cartService } from "../services/cart.service";
import logger from "../utils/logger";

const CreateCartHandler = asyncHandler(async (req: Request, res: Response) => {
  const { userId, name } = (req as AuthenticatedRequest).user;
  const storeId = req.params.storeId;

  const result = await cartService.createCart(userId, {
    productId: req.body.productId,
    idempotencyKey: req.body.idempotencyKey,
    productTitle: req.body.productTitle,
    productImage: req.body.productImage,
    productPrice: req.body.productPrice,
    productDescription: req.body.productDescription,
    quantity: req.body.quantity ?? 1,
    fullName: name,
    email: req.body.email,
    storeId,
    sellerId: req.body.sellerId
  });

  if (typeof result === "string") {
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({ message: result });
    return;
  }

  res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json(result);
});

// GET user's cart for this store
const GetUserCartHandler = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;
  const storeId = req.params.storeId;

  const cart = await cartService.getCart(userId, storeId);

  if (!cart) {
    res.status(NOT_FOUND_STATUS_CODE).json({ message: "Cart not found" });
    return;
  }

  res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(cart);
});

const GetAllStoreCartHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const result = await cartService.getAllCarts(
      { storeId: req.params.storeId },
      skip,
      Number(limit)
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(result);
  }
);

// Admin: Get any cart by Mongo _id
const GetSingleStoreCartHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const cart = await cartService.getCartById(req.params.id);

    if (!cart) {
      logger.error("Cart item not found:", {
        event: "cart_not_found",
        user: (req as AuthenticatedRequest).user?.userId,
        cart,
      });
      res.status(NOT_FOUND_STATUS_CODE).json({ message: "Cart not found" });
      return;
    }

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(cart);
  }
);

// Update item quantity in user's cart
const UpdateCartHandler = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = (req as AuthenticatedRequest).user;
  const storeId = req.params.storeId;
  const { productId, quantity } = req.body;

  if (!productId || quantity === undefined) {
    res.status(BAD_REQUEST_STATUS_CODE);
    throw new Error("productId and quantity are required");
  }

  const cart = await cartService.updateCart(
    userId,
    storeId,
    productId,
    quantity
  );

  if (!cart) {
    logger.error("Cart item not found:", {
      event: "cart_not_found",
      user: (req as AuthenticatedRequest).user?.userId,
      cart,
    });
    res.status(NOT_FOUND_STATUS_CODE);
    throw new Error("Cart or item not found");
  }

  res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(cart);
});

// Remove item from user's cart
const DeleteCartItemHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = (req as AuthenticatedRequest).user;
    const storeId = req.params.storeId;
    const { productId } = req.body;

    if (!productId) {
       logger.error("Product item not found:", {
        event: "product_not_found",
        user: (req as AuthenticatedRequest).user?.userId,
        storeId,
        productId
      });
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("productId is required");
    }

    await cartService.deleteCart(userId, storeId, productId);

    res
      .status(SUCCESSFULLY_FETCHED_STATUS_CODE)
      .json({ message: "Item removed from cart" });
  }
);

export {
  CreateCartHandler,
  GetUserCartHandler,
  GetAllStoreCartHandler,
  GetSingleStoreCartHandler,
  UpdateCartHandler,
  DeleteCartItemHandler,
};
