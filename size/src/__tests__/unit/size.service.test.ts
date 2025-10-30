import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { Types } from "mongoose";
import Size, { ISize } from "../../models/Size";
import redisClient from "../../config/redis";
import {
  CreateSizeService,
  GetAllStoreSizeService,
  GetASingleSizeService,
  UpdateSizeService,
  DeleteSizeService,
} from "../../services/size.service";

// Mock dependencies
jest.mock("../../models/Size", () => ({
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

const MockedSize = Size as jest.Mocked<typeof Size>;
const MockedRedis = redisClient as jest.Mocked<typeof redisClient>;

describe("Size Service Tests", () => {
  const mockUserId = "66c0a27e71a3ea08d6a26f8f";
  const mockStoreId = "66c0a27e71a3ea08d6a26f90";
  const mockSizeId = "66c0a27e71a3ea08d6a26f91";

  const mockSizeData: Partial<ISize> = {
    name: "Test Size",
    value: "100",
  };

  const mockSize: ISize = {
    user: new Types.ObjectId(mockUserId),
    store: new Types.ObjectId(mockStoreId),
    name: "Test Size",
    value: "100",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("CreateSizeService", () => {
    it("should create a Size successfully with all fields", async () => {
    });

    it("should handle creation failure", async () => {
    });
  });

  describe("GetAllStoreSizeService", () => {
    it("should return cached Sizes when cache exists", async () => {
      const cachedSizes = [mockSize];
      const query = { name: "test" };
      const page = 0;
      const limit = 10;
      const cacheKey = `Size:search:${JSON.stringify({ ...query, skip: page, limit })}`;
      MockedRedis.get.mockResolvedValueOnce(JSON.stringify(cachedSizes));

      const result = await GetAllStoreSizeService(query, page, limit);

      expect(MockedRedis.get).toHaveBeenCalledWith(cacheKey);
      expect(result).toEqual(cachedSizes);
      expect(MockedSize.find).not.toHaveBeenCalled();
    });

    it("should fetch and cache Sizes when cache is empty", async () => {
      const Sizes = [mockSize];
      const query = { store: mockStoreId };
      const page = 0;
      const limit = 10;
      const cacheKey = `Size:search:${JSON.stringify({ ...query, skip: page, limit })}`;

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(Sizes),
      };
      MockedRedis.get.mockResolvedValueOnce(null);
      MockedSize.find.mockReturnValue(mockQuery as any);

      const result = await GetAllStoreSizeService(query, page, limit);

      expect(MockedSize.find).toHaveBeenCalledWith(query);
      expect(mockQuery.skip).toHaveBeenCalledWith(page);
      expect(mockQuery.limit).toHaveBeenCalledWith(limit);
      expect(mockQuery.sort).toHaveBeenCalledWith("-createdAt");
      expect(mockQuery.lean).toHaveBeenCalled();
      expect(MockedRedis.set).toHaveBeenCalledWith(
        cacheKey,
        JSON.stringify(Sizes),
        "EX",
        3600
      );
      expect(result).toEqual(Sizes);
    });

    it("should handle empty results with caching", async () => {
      const Sizes: ISize[] = [];
      const query = { name: "nonexistent" };
      const page = 0;
      const limit = 10;
      const cacheKey = `Size:search:${JSON.stringify({ ...query, skip: page, limit })}`;

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(Sizes),
      };
      MockedRedis.get.mockResolvedValueOnce(null);
      MockedSize.find.mockReturnValue(mockQuery as any);

      const result = await GetAllStoreSizeService(query, page, limit);

      expect(result).toEqual([]);
      expect(MockedRedis.set).toHaveBeenCalledWith(
        cacheKey,
        JSON.stringify(Sizes),
        "EX",
        3600
      );
    });
  });

  describe("GetASingleSizeService", () => {
    it("should return cached Size when available", async () => {
      const cacheKey = `Size:${mockSizeId}`;
      MockedRedis.get.mockResolvedValueOnce(JSON.stringify(mockSize));

      const result = await GetASingleSizeService(mockSizeId);

      expect(MockedRedis.get).toHaveBeenCalledWith(cacheKey);
      expect(result).toEqual(mockSize);
      expect(MockedSize.findById).not.toHaveBeenCalled();
    });

    it("should fetch and cache Size when not cached", async () => {
      const cacheKey = `Size:${mockSizeId}`;
      MockedRedis.get.mockResolvedValueOnce(null);
      MockedSize.findById.mockResolvedValue(mockSize);

      const result = await GetASingleSizeService(mockSizeId);

      expect(MockedSize.findById).toHaveBeenCalledWith(mockSizeId);
      expect(MockedRedis.set).toHaveBeenCalledWith(
        cacheKey,
        JSON.stringify(mockSize),
        "EX",
        3600
      );
      expect(result).toEqual(mockSize);
    });

    it("should return null when Size does not exist", async () => {
      MockedRedis.get.mockResolvedValueOnce(null);
      MockedSize.findById.mockResolvedValue(null);

      const result = await GetASingleSizeService(mockSizeId);

      expect(result).toBeNull();
      expect(MockedRedis.set).not.toHaveBeenCalled();
    });
  });

  describe("UpdateSizeService", () => {
    it("should update Size successfully", async () => {
      const updateData = { value: 150, description: "Updated description" };
      const updatedSize = { ...mockSize, ...updateData };
      MockedSize.findByIdAndUpdate.mockResolvedValue(updatedSize);

      const result = await UpdateSizeService(mockSizeId, updateData);

      expect(MockedSize.findByIdAndUpdate).toHaveBeenCalledWith(
        mockSizeId,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(updatedSize);
      expect(result?.value).toBe(150);
    });

    it("should return null when Size not found", async () => {
      MockedSize.findByIdAndUpdate.mockResolvedValue(null);

      const result = await UpdateSizeService(mockSizeId, { value: 150 });

      expect(result).toBeNull();
    });
  });

  describe("DeleteSizeService", () => {
    it("should delete Size and clear cache successfully", async () => {
      const cacheKey = `Size:${mockSizeId}`;
      MockedSize.findByIdAndDelete.mockResolvedValue(mockSize);

      const result = await DeleteSizeService(mockSizeId);

      expect(MockedSize.findByIdAndDelete).toHaveBeenCalledWith(mockSizeId);
      expect(MockedRedis.del).toHaveBeenCalledWith(cacheKey);
      expect(result).toBe("Size has been deleted");
    });

    it("should handle deletion failure gracefully", async () => {
      const cacheKey = `Size:${mockSizeId}`;
      MockedSize.findByIdAndDelete.mockResolvedValue(null);

      const result = await DeleteSizeService(mockSizeId);

      expect(MockedSize.findByIdAndDelete).toHaveBeenCalledWith(mockSizeId);
      expect(MockedRedis.del).toHaveBeenCalledWith(cacheKey);
      expect(result).toBe("Size has been deleted");
    });
  });
});