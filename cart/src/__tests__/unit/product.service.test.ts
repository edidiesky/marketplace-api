import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { Types } from "mongoose";
import Product, { IProduct } from "../../models/Product";
import redisClient from "../../config/redis";
import {
  CreateProductService,
  GetAllStoreProductService,
  GetASingleProductService,
  UpdateProductService,
  DeleteProductService,
} from "../../services/product.service";

// Mock dependencies
jest.mock("../../models/Product", () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

jest.mock("../../config/redis", () => ({
  get: jest.fn<() => Promise<string | null>>().mockResolvedValue(null),
  set: jest
    .fn<(key: string, value: string, method: string, timeout: number) => Promise<string>>()
    .mockResolvedValue("OK"),
  del: jest.fn<(key: string) => Promise<number>>().mockResolvedValue(1),
}));

jest.mock("../../utils/metrics", () => ({
  measureDatabaseQuery: jest.fn((name: string, fn: () => Promise<any>) => fn()),
}));

const MockedProduct = Product as jest.Mocked<typeof Product>;
const MockedRedis = redisClient as jest.Mocked<typeof redisClient>;

describe("Product Service Tests", () => {
  const mockUserId = "66c0a27e71a3ea08d6a26f8f";
  const mockStoreId = "66c0a27e71a3ea08d6a26f90";
  const mockProductId = "66c0a27e71a3ea08d6a26f91";

  const mockProductData: Partial<IProduct> = {
    name: "Test Product",
    price: 100,
    images: ["https://example.com/image.jpg"],
    description: "Test description",
  };

  const mockProduct: IProduct = {
    _id: new Types.ObjectId(mockProductId),
    user: new Types.ObjectId(mockUserId),
    store: new Types.ObjectId(mockStoreId),
    name: "Test Product",
    price: 100,
    images: ["https://example.com/image.jpg"],
    description: "Test description",
    isArchive: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("CreateProductService", () => {
    it("should create a product successfully with all fields", async () => {
      MockedProduct.create.mockResolvedValue(mockProduct);

      const result = await CreateProductService(mockUserId, mockStoreId, mockProductData);

      expect(MockedProduct.create).toHaveBeenCalledWith({
        user: new Types.ObjectId(mockUserId),
        store: new Types.ObjectId(mockStoreId),
        ...mockProductData,
      });
      expect(result).toEqual(mockProduct);
      expect(result.name).toBe(mockProductData.name);
      expect(result.price).toBe(mockProductData.price);
    });

    it("should handle creation failure", async () => {
      MockedProduct.create.mockRejectedValue(new Error("DB Error"));

      await expect(
        CreateProductService(mockUserId, mockStoreId, mockProductData)
      ).rejects.toThrow("DB Error");
    });
  });

  describe("GetAllStoreProductService", () => {
    it("should return cached products when cache exists", async () => {
      const cachedProducts = [mockProduct];
      const query = { name: "test" };
      const page = 0;
      const limit = 10;
      const cacheKey = `product:search:${JSON.stringify({ ...query, skip: page, limit })}`;
      MockedRedis.get.mockResolvedValueOnce(JSON.stringify(cachedProducts));

      const result = await GetAllStoreProductService(query, page, limit);

      expect(MockedRedis.get).toHaveBeenCalledWith(cacheKey);
      expect(result).toEqual(cachedProducts);
      expect(MockedProduct.find).not.toHaveBeenCalled();
    });

    it("should fetch and cache products when cache is empty", async () => {
      const products = [mockProduct];
      const query = { store: mockStoreId };
      const page = 0;
      const limit = 10;
      const cacheKey = `product:search:${JSON.stringify({ ...query, skip: page, limit })}`;

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(products),
      };
      MockedRedis.get.mockResolvedValueOnce(null);
      MockedProduct.find.mockReturnValue(mockQuery as any);

      const result = await GetAllStoreProductService(query, page, limit);

      expect(MockedProduct.find).toHaveBeenCalledWith(query);
      expect(mockQuery.skip).toHaveBeenCalledWith(page);
      expect(mockQuery.limit).toHaveBeenCalledWith(limit);
      expect(mockQuery.sort).toHaveBeenCalledWith("-createdAt");
      expect(mockQuery.lean).toHaveBeenCalled();
      expect(MockedRedis.set).toHaveBeenCalledWith(
        cacheKey,
        JSON.stringify(products),
        "EX",
        3600
      );
      expect(result).toEqual(products);
    });

    it("should handle empty results with caching", async () => {
      const products: IProduct[] = [];
      const query = { name: "nonexistent" };
      const page = 0;
      const limit = 10;
      const cacheKey = `product:search:${JSON.stringify({ ...query, skip: page, limit })}`;

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(products),
      };
      MockedRedis.get.mockResolvedValueOnce(null);
      MockedProduct.find.mockReturnValue(mockQuery as any);

      const result = await GetAllStoreProductService(query, page, limit);

      expect(result).toEqual([]);
      expect(MockedRedis.set).toHaveBeenCalledWith(
        cacheKey,
        JSON.stringify(products),
        "EX",
        3600
      );
    });
  });

  describe("GetASingleProductService", () => {
    it("should return cached product when available", async () => {
      const cacheKey = `product:${mockProductId}`;
      MockedRedis.get.mockResolvedValueOnce(JSON.stringify(mockProduct));

      const result = await GetASingleProductService(mockProductId);

      expect(MockedRedis.get).toHaveBeenCalledWith(cacheKey);
      expect(result).toEqual(mockProduct);
      expect(MockedProduct.findById).not.toHaveBeenCalled();
    });

    it("should fetch and cache product when not cached", async () => {
      const cacheKey = `product:${mockProductId}`;
      MockedRedis.get.mockResolvedValueOnce(null);
      MockedProduct.findById.mockResolvedValue(mockProduct);

      const result = await GetASingleProductService(mockProductId);

      expect(MockedProduct.findById).toHaveBeenCalledWith(mockProductId);
      expect(MockedRedis.set).toHaveBeenCalledWith(
        cacheKey,
        JSON.stringify(mockProduct),
        "EX",
        3600
      );
      expect(result).toEqual(mockProduct);
    });

    it("should return null when product does not exist", async () => {
      MockedRedis.get.mockResolvedValueOnce(null);
      MockedProduct.findById.mockResolvedValue(null);

      const result = await GetASingleProductService(mockProductId);

      expect(result).toBeNull();
      expect(MockedRedis.set).not.toHaveBeenCalled();
    });
  });

  describe("UpdateProductService", () => {
    it("should update product successfully", async () => {
      const updateData = { price: 150, description: "Updated description" };
      const updatedProduct = { ...mockProduct, ...updateData };
      MockedProduct.findByIdAndUpdate.mockResolvedValue(updatedProduct);

      const result = await UpdateProductService(mockProductId, updateData);

      expect(MockedProduct.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProductId,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(updatedProduct);
      expect(result?.price).toBe(150);
    });

    it("should return null when product not found", async () => {
      MockedProduct.findByIdAndUpdate.mockResolvedValue(null);

      const result = await UpdateProductService(mockProductId, { price: 150 });

      expect(result).toBeNull();
    });
  });

  describe("DeleteProductService", () => {
    it("should delete product and clear cache successfully", async () => {
      const cacheKey = `product:${mockProductId}`;
      MockedProduct.findByIdAndDelete.mockResolvedValue(mockProduct);

      const result = await DeleteProductService(mockProductId);

      expect(MockedProduct.findByIdAndDelete).toHaveBeenCalledWith(mockProductId);
      expect(MockedRedis.del).toHaveBeenCalledWith(cacheKey);
      expect(result).toBe("Product has been deleted");
    });

    it("should handle deletion failure gracefully", async () => {
      const cacheKey = `product:${mockProductId}`;
      MockedProduct.findByIdAndDelete.mockResolvedValue(null);

      const result = await DeleteProductService(mockProductId);

      expect(MockedProduct.findByIdAndDelete).toHaveBeenCalledWith(mockProductId);
      expect(MockedRedis.del).toHaveBeenCalledWith(cacheKey);
      expect(result).toBe("Product has been deleted");
    });
  });
});