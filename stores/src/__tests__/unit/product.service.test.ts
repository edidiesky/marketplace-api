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
import { measureDatabaseQuery } from "../../utils/metrics";

// Mock dependencies
jest.mock("../../models/Product", () => ({
  create: jest.fn<() => Promise<IProduct>>(),
  find: jest.fn<() => Promise<IProduct[]>>(),
  findById: jest.fn<() => Promise<IProduct>>(),
  findOneAndUpdate: jest.fn<() => Promise<IProduct>>(),
  findByIdAndDelete: jest.fn<() => Promise<"">>(),
}));

jest.mock("../../config/redis", () => ({
  get: jest.fn<() => Promise<string | null>>().mockResolvedValue(null),
  set: jest
    .fn<
      (
        key: string,
        value: string,
        secondsToken: "EX",
        seconds: number | string
      ) => Promise<"OK">
    >()
    .mockResolvedValue("OK"),
  del: jest.fn<(key: string) => Promise<number>>().mockResolvedValue(1),
}));

const MockedProduct = Product as jest.Mocked<typeof Product>;
const MockedRedis = redisClient as jest.Mocked<typeof redisClient>;
const MockedMeasure = measureDatabaseQuery as jest.MockedFunction<
  typeof measureDatabaseQuery
>;

describe("Product Service Tests", () => {
  const userId = "66c0a27e71a3ea08d6a26f8f";
  const productId = "66c0a27e71a3ea08d6a26f91";
  const storeId = "66c0a27e71a3ea08d6a26f90";
  const mockUserId = new Types.ObjectId(userId);
  const mockStoreId = new Types.ObjectId(storeId);
  const mockProductId = new Types.ObjectId(productId);

  const mockProductData: Partial<IProduct> = {
    name: "Test Product",
    price: 100,
    images: ["https://example.com/image.jpg"],
    description: "Test description",
  };

  const mockProduct: IProduct = {
    _id: productId,
    user: userId,
    store: storeId,
    name: "Test Product",
    price: 100,
    images: ["https://example.com/image.jpg"],
    description: "Test description",
    isArchive: false,
  } as unknown as IProduct;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });
  describe("POST /api/v1/products/store/3748484", () => {
    it("should create a product based on complete record", async () => {
      // Arrange
      (Product.create as jest.Mock).mockReturnValue(mockProduct);

      // Act
      const result = await CreateProductService(
        userId,
        storeId,
        mockProductData
      );
      // Assert
      expect(Product.create).toHaveBeenCalledWith({
        ...mockProductData,
        user: mockUserId,
        store: mockStoreId,
      });

      expect(result).toEqual(mockProduct);
      expect(result.description).toBe(mockProduct.description);
      expect(result.name).toBe(mockProduct.name);
      expect(result.price).toBe(mockProduct.price);
    });
    it("should return Database error when the DB is down", async () => {
      const dbError = new Error(
        "Database is down. Kindly contact support team"
      );
      MockedProduct.create.mockRejectedValue(dbError);
      await expect(
        CreateProductService(userId, storeId, mockProductData)
      ).rejects.toThrow("Database is down. Kindly contact support team");
    });
    it("should handle validation errors", async () => {
      const validationError = new Error("Validation failed: price is required");
      MockedProduct.create.mockRejectedValue(validationError);
      // ACT & ASSERT
      await expect(
        CreateProductService(mockUserId.toString(), mockStoreId.toString(), {
          name: "Invalid Product",
          images: [],
        } as any)
      ).rejects.toThrow("Validation failed");
    });
  });
  describe("GET /api/v1/products", () => {
    it("should return cached product when cache exists", async () => {
      // Arrange
      const cachedProducts = [mockProduct];
      const query = { name: "Test" };
      const page = 0;
      const limit = 10;
      const cacheKey = `product:search:${JSON.stringify({
        ...query,
        skip: page,
        limit,
      })}`;
      MockedRedis.get.mockResolvedValue(JSON.stringify(cachedProducts));

      // ACT
      const result = await GetAllStoreProductService(query, page, limit);

      // ASSERT
      expect(MockedRedis.get).toHaveBeenCalledWith(cacheKey);
      expect(result).toEqual(cachedProducts);
      expect(MockedProduct.find).not.toHaveBeenCalled();
    });
    it("should fetch product from DB when the cache is empty", async () => {
      // Arrange
      const productData = [mockProduct];

      const skip = 0;
      const limit = 10;
      const sort = "-createdAt";
      const query = { user: mockUserId };
      const cacheKey = `product:search:${JSON.stringify({
        ...query,
        skip,
        limit,
      })}`;
      const queryChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest
          .fn<() => Promise<IProduct[]>>()
          .mockResolvedValue(productData),
      };
      MockedRedis.get.mockResolvedValueOnce(null);
      MockedProduct.find.mockReturnValue(queryChain as any);
      // Act
      const result = await GetAllStoreProductService(query, skip, limit);
      // Assert
      expect(Product.find).toHaveBeenCalledWith(query);
      expect(queryChain.skip).toHaveBeenCalledWith(skip);
      expect(queryChain.limit).toHaveBeenCalledWith(limit);
      expect(queryChain.sort).toHaveBeenCalledWith(sort);
      expect(queryChain.lean).toHaveBeenCalled();
      expect(result).toBe(productData);
      expect(MockedRedis.set).toHaveBeenCalled();
    });
    it("should fetch no product when filter query does not match", async () => {
      const skip = 0;
      const limit = 10;
      const sort = "-createdAt";
      const query = { user: "23e3321" };
      const cacheKey = `product:search:${JSON.stringify({
        ...query,
        skip,
        limit,
      })}`;
      const queryChain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn<() => Promise<IProduct[]>>().mockResolvedValue([]),
      };
      MockedRedis.get.mockResolvedValueOnce(null);
      MockedProduct.find.mockReturnValue(queryChain as any);
      // Act
      const result = await GetAllStoreProductService(query, skip, limit);
      // Assert
      expect(Product.find).toHaveBeenCalledWith(query);
      expect(result).toEqual([]);
    });
  });
  describe("GET /api/v1/products/273373", () => {
    it("should fetch single product from DB when cache is empty", async () => {
      // Arrange
      const id = productId;
      const cacheKey = `product:${id}`;
      MockedRedis.get.mockResolvedValueOnce(null);
      MockedProduct.findById.mockResolvedValue(mockProduct);
      // Act
      const result = await GetASingleProductService(productId);
      // Assert
      expect(MockedProduct.findById).toHaveBeenCalledWith(id);
      expect(result).toBe(mockProduct);
      expect(MockedRedis.set).toHaveBeenCalled();
    });
    it("should return null when the product does not exists", async () => {
      // Arrange
      const id = "";
      const cacheKey = `product:${id}`;
      MockedRedis.get.mockResolvedValueOnce(null);
      MockedProduct.findById.mockResolvedValue(null);
      // Act
      const result = await GetASingleProductService(productId);
      // Assert
      expect(result).toBeNull();
      expect(MockedRedis.set).not.toHaveBeenCalled();
    });
    it("should fetch single product from cache when cache is not empty", async () => {
      // Arrange
      const id = productId;
      const cacheKey = `product:${id}`;
      MockedRedis.get.mockResolvedValueOnce(JSON.stringify(mockProduct));
      MockedProduct.findById.mockResolvedValue(null);
      // Act
      const result = await GetASingleProductService(productId);
      // Assert
      expect(MockedProduct.findById).not.toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
      expect(MockedRedis.get).toHaveBeenCalledWith(cacheKey);
    });
  });
  describe("PUT /api/v1/products/173348", () => {
    it("should update product succesfully", async () => {
      const id = productId;
      const mockProductData: Partial<IProduct> = {
        name: "Test2 Product",
        description: "Test2 description",
        price: 200,
      };
      const mockUpdatedProduct: IProduct = {
        _id: productId,
        user: userId,
        store: storeId,
        images: ["https://example.com/image.jpg"],
        isArchive: false,
        ...mockProductData,
      } as unknown as IProduct;
      MockedProduct.findOneAndUpdate.mockResolvedValue(mockUpdatedProduct);

      // Act
      const result = await UpdateProductService(id, mockProductData);
      // Assert
      expect(MockedProduct.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: productId },
        { $set: mockProductData },
        { new: true, runValidators: true }
      );
      expect(result).toBe(mockUpdatedProduct);
    });
    it("should return null when product not found", async () => {
      const id = "";
      const mockProductData: Partial<IProduct> = {
        name: "Test2 Product",
        description: "Test2 description",
        price: 200,
      };
  
      MockedProduct.findOneAndUpdate.mockResolvedValue(null);
      // Act
      const result = await UpdateProductService(id, mockProductData);
      // Assert
      expect(result).toBeNull();
    });
  });
});
