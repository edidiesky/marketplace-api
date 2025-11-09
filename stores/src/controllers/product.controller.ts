import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import {
  CreateProductService,
  GetAllStoreProductService,
  GetASingleProductService,
  UpdateProductService,
  DeleteProductService,
} from "../services/product.service";
import {
  BAD_REQUEST_STATUS_CODE,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import { IProduct } from "../models/Product";
import { FilterQuery } from "mongoose";
import { AuthenticatedRequest } from "../types";

// @description: Create Product handler
// @route  POST /products/:storeid
// @access  Private
const CreateProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const storeId = req.params.storeid;
    const { userId } = (req as AuthenticatedRequest).user;
    const product = await CreateProductService(userId, storeId, {
      ...req.body,
    });
    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json(product);
  }
);

// @description: Get All Products Handler
// @route  GET /products/:storeid
// @access  Private
const GetAllStoreProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const { page = 1, limit = 10, name, size, category, price } = req.query;
    const storeId = req.params.storeid;

    const query: FilterQuery<IProduct> = {
      storeId,
    };
    if (size) query.size = size;
    if (userId) query.userId = userId;
    if (category) query.category = category;
    if (name) query.name = name;
    if (price) query.price = price;
    const skip = (Number(page) - 1) * Number(limit);

    const products = await GetAllStoreProductService(
      query,
      skip,
      Number(limit)
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(products);
  }
);

// @description: Get A Single Product Handler
// @route  GET /products/:id
// @access  Public
const GetSingleStoreProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const product = await GetASingleProductService(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(product);
  }
);

// @description: Update A Single Product Handler
// @route  PUT /products/:id
// @access  Private
const UpdateProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingProduct = await GetASingleProductService(id);

    if (!existingProduct) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This product does not exist");
    }
    const product = await UpdateProductService(
      id,
      req.body as Partial<IProduct>
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(product);
  }
);

// @description: Delete A Single Product Handler
// @route  DELETE /products/:id
// @access  Private
const DeleteProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingProduct = await GetASingleProductService(id);

    if (!existingProduct) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This product does not exist");
    }
    const message = await DeleteProductService(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(message);
  }
);

export {
  CreateProductHandler,
  GetAllStoreProductHandler,
  GetSingleStoreProductHandler,
  UpdateProductHandler,
  DeleteProductHandler,
};
