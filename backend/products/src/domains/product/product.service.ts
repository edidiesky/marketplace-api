import sanitizeHtml from "sanitize-html";
import mongoose from "mongoose";
import { productRepository }  from "./product.repository";
import { outboxRepository }   from "../outbox/outbox.repository";
import { AppError }           from "../../utils/AppError";
import logger                 from "../../utils/logger";
import { SERVICE_NAME }       from "../../constants";
import { requestContext }     from "../../context/requestContext";
import { OutboxEventType }    from "../outbox/outbox.model";
import {
  CreateProductDto,
  ProductListQueryDto,
  ProductListResponseDto,
  ProductResponseDto,
  UpdateProductDto,
} from "./product.dto";
import { IProduct } from "./product.model";
import { FilterQuery, Types } from "mongoose";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags:        ["p", "b", "i", "u", "a", "ul", "ol", "li", "h1", "h2"],
  allowedAttributes:  { a: ["href"] },
  disallowedTagsMode: "discard",
};

function toDto(product: IProduct): ProductResponseDto {
  return {
    productId:      product._id.toString(),
    ownerId:        product.ownerId.toString(),
    organizationId: product.organizationId.toString(),
    storeId:        product.storeId.toString(),
    ownerName:      product.ownerName,
    storeName:      product.storeName,
    name:           product.name,
    description:    product.description,
    price:          product.price,
    images:         product.images,
    category:       product.category,
    colors:         product.colors,
    size:           product.size,
    sku:            product.sku,
    isArchive:      product.isArchive,
    isDeleted:      product.isDeleted,
    createdAt:      product.createdAt,
    updatedAt:      product.updatedAt,
  };
}

export const productService = {
  async getProductsByStoreQuery(
  query: FilterQuery<Partial<IProduct>>,
  page:  number,
  limit: number
): Promise<ProductListResponseDto> {
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    productRepository.findAll(query, skip, limit),
    productRepository.count(query),
  ]);

  return {
    products:   products.map(toDto),
    totalCount: total,
    totalPages: Math.ceil(total / limit),
    page,
    limit,
  };
},
  async createProduct(
    dto: CreateProductDto
  ): Promise<ProductResponseDto> {
    const session = await mongoose.startSession();
    let product!: IProduct;

    await session.withTransaction(async () => {
      const description = dto.description
        ? sanitizeHtml(dto.description, SANITIZE_OPTIONS)
        : undefined;

      product = await productRepository.create(
        {
          ownerId:        new Types.ObjectId(dto.ownerId),
          organizationId:dto.organizationId,
          storeId:        new Types.ObjectId(dto.storeId),
          ownerName:      dto.ownerName,
          storeName:      dto.storeName,
          name:           dto.name,
          description,
          price:          dto.price,
          images:         dto.images   ?? [],
          category:       dto.category ?? [],
          colors:         dto.colors   ?? [],
          size:           dto.size     ?? [],
          sku:            dto.sku,
          
        },
        session
      );

      await outboxRepository.create(
        OutboxEventType.PRODUCT_CREATED,
        {
          productId:   product._id.toString(),
          storeId:     dto.storeId,
          ownerId:     dto.ownerId,
          storeName:   dto.storeName ?? "",
          name:        product.name,
          description: product.description,
          price:       product.price,
          images:      product.images,
          isDeleted:   false,
          createdAt:   product.createdAt,
          stockQuantity: dto.stockQuantity ?? 0,
          organizationId: dto.organizationId,
        },
        session
      );
    });

    session.endSession();

    requestContext.set({
      eventType: "product.created",
    });

    logger.info("product_service_created", {
      event:     "product_service_created",
      service:   SERVICE_NAME,
      productId: product._id.toString(),
      storeId:   dto.storeId,
    });

    return toDto(product);
  },

  async getProductsByStore(
    dto: ProductListQueryDto
  ): Promise<ProductListResponseDto> {
    const { storeId, category, isArchive, page, limit } = dto;
    const skip = (page - 1) * limit;

    const query: FilterQuery<IProduct> = {
      storeId:   new Types.ObjectId(storeId),
      isDeleted: false,
    };

    if (category)              query["category"] = category;
    if (isArchive !== undefined) query["isArchive"] = isArchive;

    const products = await productRepository.findAll(query, skip, limit);
    const total    = await productRepository.count(query);

    return {
      products:   products.map(toDto),
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      page,
      limit,
    };
  },

  async getProductById(productId: string): Promise<ProductResponseDto> {
    const product = await productRepository.findById(productId);
    if (!product || product.isDeleted) {
      throw AppError.notFound("Product not found.");
    }
    return toDto(product);
  },

  async updateProduct(
    productId:      string,
    organizationId: string,
    dto:            UpdateProductDto
  ): Promise<ProductResponseDto> {
    const existing = await productRepository.findById(productId);
    if (!existing || existing.isDeleted) {
      throw AppError.notFound("Product not found.");
    }

    if (existing.organizationId.toString() !== organizationId) {
      throw AppError.forbidden(
        "You do not have permission to update this product."
      );
    }

    const session = await mongoose.startSession();
    let updated!: IProduct;

    await session.withTransaction(async () => {
      const description = dto.description
        ? sanitizeHtml(dto.description, SANITIZE_OPTIONS)
        : dto.description;

      const result = await productRepository.updateById(
        productId,
        { ...dto, description },
      );
      if (!result) throw AppError.notFound("Product not found.");
      updated = result;

      await outboxRepository.create(
        OutboxEventType.PRODUCT_UPDATED,
        {
          productId,
          name:        updated.name,
          description: updated.description,
          price:       updated.price,
          images:      updated.images,
          isDeleted:   updated.isDeleted,
          updatedAt:   updated.updatedAt,
        },
        session
      );
    });

    session.endSession();

    logger.info("product_service_updated", {
      event:     "product_service_updated",
      service:   SERVICE_NAME,
      productId,
    });

    return toDto(updated);
  },

  async softDeleteProduct(
    productId:      string,
    userId:         string,
    organizationId: string
  ): Promise<void> {
    const existing = await productRepository.findById(productId);
    if (!existing || existing.isDeleted) {
      throw AppError.notFound("Product not found.");
    }

    if (existing.organizationId.toString() !== organizationId) {
      throw AppError.forbidden(
        "You do not have permission to delete this product."
      );
    }

    const session = await mongoose.startSession();

    await session.withTransaction(async () => {
      await productRepository.softDeleteById(productId, userId, session);

      await outboxRepository.create(
        OutboxEventType.PRODUCT_DELETED,
        { productId },
        session
      );
    });

    session.endSession();

    logger.info("product_service_soft_deleted", {
      event:     "product_service_soft_deleted",
      service:   SERVICE_NAME,
      productId,
      userId,
    });
  },

  async restoreProduct(
    productId:      string,
    organizationId: string
  ): Promise<ProductResponseDto> {
    const existing = await productRepository.findById(productId);
    if (!existing) throw AppError.notFound("Product not found.");
    if (!existing.isDeleted) {
      throw AppError.badRequest("Product is not deleted.");
    }

    if (existing.organizationId.toString() !== organizationId) {
      throw AppError.forbidden(
        "You do not have permission to restore this product."
      );
    }

    const session = await mongoose.startSession();
    let restored!: IProduct;

    await session.withTransaction(async () => {
      const result = await productRepository.restoreById(productId, session);
      if (!result) throw AppError.notFound("Product not found.");
      restored = result;

      await outboxRepository.create(
        OutboxEventType.PRODUCT_UPDATED,
        {
          productId,
          isDeleted: false,
          updatedAt: restored.updatedAt,
        },
        session
      );
    });

    session.endSession();

    logger.info("product_service_restored", {
      event:     "product_service_restored",
      service:   SERVICE_NAME,
      productId,
    });

    return toDto(restored);
  },
};