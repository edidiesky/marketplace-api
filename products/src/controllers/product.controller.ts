import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import sanitizeHtml from "sanitize-html";
import {
  BAD_REQUEST_STATUS_CODE,
  PRODUCT_ONBOARDING_COMPLETED_TOPIC,
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../constants";
import { IProduct } from "../models/Product";
import { FilterQuery } from "mongoose";
import { AuthenticatedRequest } from "../types";
import productService from "../services/product.service";
import { sendProductMessage } from "../messaging/producer";
import logger from "../utils/logger";

// @description: Create Product handler
// @route  POST /api/v1/products
// @access  Private
const CreateProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = (req as AuthenticatedRequest).user;
    const productBody = req.body as IProduct;
    const description = sanitizeHtml(req.body.description || "", {
      allowedTags: ["p", "b", "i", "u", "a", "ul", "ol", "li", "h1", "h2"],
      allowedAttributes: { a: ["href"] },
      disallowedTagsMode: "discard",
    });
    const product = await productService.CreateProductService(userId, {
      description,
      ...productBody,
    });

    if (product) {
      await sendProductMessage(PRODUCT_ONBOARDING_COMPLETED_TOPIC, {
        productId: product._id,
        storeId: productBody.store,
        ownerId: userId,
        sku:
          productBody.sku ||
          `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: productBody.name,
        image: productBody.images[0],
        availableStock: productBody.availableStock,
        thresholdStock: productBody.thresholdStock || 10,
        trackInventory: productBody.trackInventory ?? true,
        createdAt: new Date(),
        idempotencyId: productBody.idempotencyId || `${userId}-${product._id}`,
      }).catch((error) => {
        logger.error("Failed to send product onboarding completed message:", {
          error: error.message,
          productId: product._id,
        });
      });
    }
    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json(product);
  }
);

// @description: Get All Products Handler
// @route  GET /api/v1/products
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

    const products = await productService.getAllProducts(
      query,
      skip,
      Number(limit)
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(products);
  }
);

// @description: Get A Single Product Handler
// @route  GET /api/v1/products/:id
// @access  Public
const GetSingleStoreProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(product);
  }
);

// @description: Update A Single Product Handler
// @route  PUT /api/v1/products/:id
// @access  Private
const UpdateProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingProduct = await productService.getProductById(id);

    if (!existingProduct) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This product does not exist");
    }
    const product = await productService.updateProduct(
      id,
      req.body as Partial<IProduct>
    );
    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json(product);
  }
);

// @description: Delete A Single Product Handler
// @route  DELETE /api/v1/products/:id
// @access  Private
const DeleteProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const existingProduct = await productService.getProductById(id);

    if (!existingProduct) {
      res.status(BAD_REQUEST_STATUS_CODE);
      throw new Error("This product does not exist");
    }
    const message = await productService.deleteProduct(id);
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
