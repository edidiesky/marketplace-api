import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import {
  BAD_REQUEST_STATUS_CODE,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import { ICart } from "../models/Cart";
import { AuthenticatedRequest } from "../types";
import { cartService } from "../services/cart.service";
import { buildQuery } from "../utils/buildQuery";

// @description: Create Cart handler
// @route  POST /api/v1/carts
// @access  Private
const CreateCartHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const cart = await cartService.createCart(userId, {
      ...req.body,
    });
    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json(cart);
  }
);

// @description: Get All Carts Handler
// @route  GET /api/v1/carts
// @access  Private
const GetAllStoreCartHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { page = 1, limit = 10, name, size, category, price } = req.query;
    const storeId = req.params.storeid;

    const queryFilter  = buildQuery(req);
    const skip = (Number(page) - 1) * Number(limit);

    const carts = await cartService.getAllCarts(
      queryFilter,
      skip,
      Number(limit)
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(carts);
  }
);

// @description: Get A Single cart Handler
// @route  GET /api/v1/carts/:id
// @access  Public
const GetSingleStoreCartHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const cart = await cartService.getCartById(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(cart);
  }
);

// @description: Update A Single cart Handler
// @route  PUT /api/v1/carts/:id
// @access  Private
const UpdateCartHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingCart = await cartService.getCartById(id);

    if (!existingCart) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This cart does not exist");
    }
    const cart = await cartService.updateCart(
      id,
      req.body as Partial<ICart>
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(cart);
  }
);

// @description: Delete A Single cart Handler
// @route  DELETE /api/v1/carts/:id
// @access  Private
const DeleteCartHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingCart = await cartService.getCartById(id);

    if (!existingCart) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This Cart does not exist");
    }
    const message = await cartService.deleteCart(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(message);
  }
);

export {
  CreateCartHandler,
  GetAllStoreCartHandler,
  GetSingleStoreCartHandler,
  UpdateCartHandler,
  DeleteCartHandler,
};
