import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { productService }           from "./product.service";
import { AuthenticatedRequest }     from "../../middleware/contextMiddleware";
import { AppError }                 from "../../utils/AppError";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../../constants";

export const CreateProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId, organizationId } = (req as AuthenticatedRequest).user;
    const storeId = req.params["storeId"] as string;

    if (!organizationId) {
      throw AppError.forbidden("Organization context required.");
    }

    const product = await productService.createProduct({
      ...req.body,
      ownerId:        userId,
      organizationId,
      storeId,
    });

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success: true,
      data:    product,
    });
  }
);

export const GetStoreProductsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const storeId   = req.params["storeId"] as string;
    const page      = Number(req.query["page"]      ?? 1);
    const limit     = Number(req.query["limit"]     ?? 20);
    const category  = req.query["category"]  as string | undefined;
    const isArchive = req.query["isArchive"] === "true"
      ? true
      : req.query["isArchive"] === "false"
        ? false
        : undefined;

    const result = await productService.getProductsByStore({
      storeId,
      category,
      isArchive,
      page,
      limit,
    });

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);

export const GetProductByIdHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const productId = req.params["productId"] as string;

    const product = await productService.getProductById(productId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    product,
    });
  }
);

export const UpdateProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { organizationId } = (req as AuthenticatedRequest).user;
    const productId = req.params["productId"] as string;

    if (!organizationId) {
      throw AppError.forbidden("Organization context required.");
    }

    const product = await productService.updateProduct(
      productId,
      organizationId,
      req.body
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    product,
    });
  }
);

export const DeleteProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId, organizationId } = (req as AuthenticatedRequest).user;
    const productId = req.params["productId"] as string;

    if (!organizationId) {
      throw AppError.forbidden("Organization context required.");
    }

    await productService.softDeleteProduct(productId, userId, organizationId);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      message: "Product deleted successfully.",
    });
  }
);

export const RestoreProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { organizationId } = (req as AuthenticatedRequest).user;
    const productId = req.params["productId"] as string;

    if (!organizationId) {
      throw AppError.forbidden("Organization context required.");
    }

    const product = await productService.restoreProduct(
      productId,
      organizationId
    );

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    product,
    });
  }
);