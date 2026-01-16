import { describe, beforeEach, it, expect, jest } from "@jest/globals";
import mongoose, { Types } from "mongoose";
import { ProductService } from "../../services/product.service";
import type { IProductRepository } from "../../repository/IProductRepository";
import type { IProduct } from "../../models/Product";

jest.mock("../../config/redis", () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    disconnect: jest.fn(),
    quit: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    status: "ready", 
  }));
});

jest.mock("mongoose", () => ({
  Types: {
    ObjectId: jest.fn((val) => val || "mock-objectid"),
  },
  startSession: jest.fn<()=> Promise<any>>().mockResolvedValue("mock-session"),
  connect: jest.fn(),
}));

jest.mock("../../config/redis", () => ({
  default: jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn(),
    quit: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    status: "ready",
  })),
}));

jest.unstable_mockModule("../../utils/withTransaction", () => ({
  withTransaction: jest.fn(async (callback: any) => {
    const mockSession = { fake: "session" };
    return await callback(mockSession);
  }),
}));


// Mock repo
const mockProductRepo = {
  createProduct: jest.fn(),
} as unknown as jest.Mocked<IProductRepository>;

describe("ProductService", () => {
  let service: ProductService;

  const userId = "66c0a27e71a3ea08d6a26f8f";
  const storeId = new Types.ObjectId("66c0a27e71a3ea08d6a26f90");
  const productId = new Types.ObjectId("66c0a27e71a3ea08d6a26f91");

  const baseProduct = {
    _id: productId,
    ownerId: new Types.ObjectId(userId),
    store: storeId,
    name: "Test Product",
    price: 100,
    images: ["https://example.com/image.jpg"],
    description: "Test description",
  } as IProduct;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductService(mockProductRepo);
  });

  describe("createProduct", () => {
    const validInput = {
      name: "Test Product",
      price: 100,
      images: ["https://example.com/image.jpg"],
      description: "Test description",
      store: storeId,
    };

    it("creates product successfully and converts userId to ObjectId", async () => {
      mockProductRepo.createProduct.mockResolvedValue(baseProduct);

      const result = await service.CreateProductService(userId, validInput);

      expect(mockProductRepo.createProduct).toHaveBeenCalledTimes(1);
      expect(mockProductRepo.createProduct).toHaveBeenCalledWith(
        {
          ownerId: new Types.ObjectId(userId),
          ...validInput,
        },
        expect.any(Object) // session
      );

      expect(result).toEqual(baseProduct);
    });

    it("handles minimal required fields", async () => {
      const minimalInput = { name: "Minimal", price: 50, store: storeId };
      const expected = { ...baseProduct, ...minimalInput, images: [], description: undefined };
      mockProductRepo.createProduct.mockResolvedValue(expected);

      const result = await service.CreateProductService(userId, minimalInput);

      expect(result).toMatchObject(minimalInput);
    });

    it("handles edge cases: empty description, zero price, large price", async () => {
      const edgeCases = [
        { description: "" },
        { price: 0 },
        { price: 999999999.99 },
      ];

      for (const override of edgeCases) {
        const input = { ...validInput, ...override };
        const expected = { ...baseProduct, ...override };
        mockProductRepo.createProduct.mockResolvedValue(expected);

        const result = await service.CreateProductService(userId, input);

        expect(result).toMatchObject(override);
        mockProductRepo.createProduct.mockClear();
      }
    });
    it("propagates errors from repository (validation, db, duplicate)", async () => {
      const errors = [
        new Error("Validation failed: name required"),
        new Error("Database connection failed"),
        new Error("E11000 duplicate key error"),
      ];

      for (const error of errors) {
        mockProductRepo.createProduct.mockRejectedValue(error);

        await expect(service.CreateProductService(userId, validInput)).rejects.toThrow(
          error.message
        );

        mockProductRepo.createProduct.mockClear();
      }
    });
  });

});