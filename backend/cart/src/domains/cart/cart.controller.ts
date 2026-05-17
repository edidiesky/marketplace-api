import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { cartService }           from "./cart.service";
import { AuthenticatedRequest }  from "../../middleware/contextMiddleware";
import { AppError }              from "../../utils/AppError";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../../constants";

export const AddToCartHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const storeId    = req.params["storeId"] as string;

    const cart = await cartService.addToCart({
      ...req.body,
      userId,
      storeId,
    });

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success: true,
      data:    cart,
    });
  }
);

export const GetUserCartHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const storeId    = req.params["storeId"] as string;

    const cart = await cartService.getCart(userId, storeId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    cart,
    });
  }
);

export const GetAllStoreCartsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const storeId = req.params["storeId"] as string;
    const page    = Number(req.query["page"]  ?? 1);
    const limit   = Number(req.query["limit"] ?? 20);

    const result = await cartService.getAllStoreCarts(storeId, page, limit);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const GetCartByIdHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const cartId = req.params["cartId"] as string;

    const cart = await cartService.getCartById(cartId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    cart,
    });
  }
);

export const UpdateCartItemHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const storeId    = req.params["storeId"] as string;
    const { productId, quantity } = req.body as {
      productId: string;
      quantity:  number;
    };

    const cart = await cartService.updateCartItem({
      userId,
      storeId,
      productId,
      quantity,
    });

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    cart,
    });
  }
);

export const DeleteCartItemHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const storeId    = req.params["storeId"] as string;
    const { productId } = req.body as { productId: string };

    if (!productId) {
      throw AppError.badRequest("productId is required.");
    }

    await cartService.deleteCartItem(userId, storeId, productId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      message: "Item removed from cart.",
    });
  }
);