import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { productService }           from "./product.service";
import { AuthenticatedRequest }     from "../../middleware/contextMiddleware";
import { AppError }                 from "../../utils/AppError";
import {
  SUCCESSFULLY_CREATED_STATUS_CODE,
  SUCCESSFULLY_FETCHED_STATUS_CODE,
} from "../../constants";
import { readGatewayContext } from "../../utils/readGatewayContext";
import { buildProductQuery } from "../../utils/buildQuery";

export const GetStoreProductsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const page  = Number(req.query["page"]  ?? 1);
    const limit = Number(req.query["limit"] ?? 20);

    const query  = buildProductQuery(req);
    const result = await productService.getProductsByStoreQuery(query, page, limit);

    res.status(SUCCESSFULLY_FETCHED_STATUS_CODE).json({
      success: true,
      data:    result,
    });
  }
);
export const CreateProductHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId }  = (req as AuthenticatedRequest).user;
    const ctx         = readGatewayContext(req);
    const storeId     = ctx.store.storeId ?? req.params["storeId"] as string;

    if (!storeId) throw AppError.badRequest("Store ID is required.");

    const product = await productService.createProduct({
      ...req.body,
      storeId,
      ownerId: userId,
    });

    res.status(SUCCESSFULLY_CREATED_STATUS_CODE).json({
      success: true,
      data:    product,
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