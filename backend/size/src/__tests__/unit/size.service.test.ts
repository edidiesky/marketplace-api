import SizeModel, { ISize } from "../../models/Size";
import {
  CreateSizeService,
  DeleteSizeService,
  GetASingleSizeService,
  GetAllStoreSizeService,
  UpdateSizeService,
} from "../../services/size.service";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import redisClient from "../../config/redis";
import { Types } from "mongoose";
import logger from "../../utils/logger";
// MOCKING MY SIZE MODEL
jest.mock("../../models/Size", () => ({
  findById: jest.fn<() => Promise<ISize>>(),
  find: jest.fn<() => Promise<ISize[]>>(),
  create: jest.fn<() => Promise<ISize>>(),
  findByIdAndUpdate: jest.fn<() => Promise<ISize>>(),
  findByIdAndDelete: jest.fn<() => Promise<"">>(),
}));

// jest.mock("../../utils/metrics");
// MOCKING MY REDIS MODEL
jest.mock("../../config/redis", () => ({
  get: jest.fn<(key: string) => Promise<null>>().mockResolvedValue(null),
  del: jest.fn<(key: string) => Promise<null>>().mockResolvedValue(null),
  set: jest
    .fn<
      (
        key: string,
        value: string,
        method: string,
        interval: Number
      ) => Promise<String>
    >()
    .mockResolvedValue("OK"),
}));

const mockSizeModel = SizeModel as jest.Mocked<typeof SizeModel>;
const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;

// TEST SUITES
describe("Size Unit Tests", () => {
  const mockUserId = new Types.ObjectId("66c0a27e71a3ea08d6a26f91");
  const mockStoreId = new Types.ObjectId("66c0a27e71a3ea08d6a26f94");
  const mockSizeId = new Types.ObjectId("66c0a27e71a3ea08d6a26f92");

  const mockSizeData: Partial<ISize> = {
    name: "Test Size",
    value: "100",
  };

  const mockSize: ISize = {
    _id: mockSizeId,
    user: mockUserId,
    store: mockStoreId,
    name: "Test Size",
    value: "100",
  } as unknown as ISize;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/v1/sizes/storeId (Create A Store Size Service)", () => {
    it("should create a store size successfully based on valid inputs", async () => {
      //  Arrange
      (SizeModel.create as jest.Mock).mockReturnValue(mockSize);
      //  Act
      const result = await CreateSizeService(
        mockUserId.toString(),
        mockStoreId.toString(),
        mockSizeData
      );

      const sizeData = {
        user: mockUserId,
        store: mockStoreId,
        ...mockSizeData,
      };
      //  Assert
      expect(SizeModel.create).toHaveBeenCalledWith(sizeData);
      expect(result).toBe(mockSize);
      expect(result.name).toBe(mockSizeData.name);
    });
    it("should NOT create a store size when invalid inputs are provided", async () => {
      //  Arrange
      const error = new Error("Please provide a valid input field");
      mockSizeModel.create.mockRejectedValue(error);
      //  Act
      await expect(
        CreateSizeService(mockUserId.toString(), mockStoreId.toString(), {
          name: "Test size",
        })
      ).rejects.toThrow(error);
    });
  });
  describe("GET /api/v1/sizes/17338/storeId (Get A Single Store Size Service)", () => {
    it("should get a single store size successfully when cache is empty", async () => {
      //  Arrange
      let id = mockSizeId.toString()
      mockRedisClient.get.mockResolvedValueOnce(null);
      mockSizeModel.findById.mockResolvedValue(mockSize);
      //  Act
      const result = await GetASingleSizeService(id);
      //  Assert
      expect(SizeModel.findById).toHaveBeenCalledWith(id);
      expect(result).toBe(mockSize);
      expect(redisClient.set).toHaveBeenCalled();
    });
    it("should get a single store size from cache when it is not empty", async () => {
      //  Arrange
      const cacheKey = `size:${mockSizeId.toString()}`;
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(mockSize));
      mockSizeModel.findById.mockResolvedValue(mockSize);
      //  Act
      const result = await GetASingleSizeService(mockSizeId.toString());
      //  Assert
      expect(redisClient.get).toHaveBeenCalledWith(cacheKey);
      expect(SizeModel.findById).not.toHaveBeenCalled();
      expect(result.name).toEqual(mockSize.name);
      expect(result.value).toEqual(mockSize.value);
    });
    it("should not get a store size when invalid Id is being provided", async () => {
      //  Arrange
      const error = new Error("Please provide a valid Size ID");
      mockSizeModel.findById.mockRejectedValue(error);
      //  Act
      await expect(
        GetASingleSizeService(mockSizeId.toString())
      ).rejects.toThrow(error);
    });
  });
  describe("GET /api/v1/sizes/storeId (Get All Store Sizes)", () => {});
  describe("PUT /api/v1/sizes/1273373/storeId (Update A Single Store Size Service)", () => {});
  describe("DELETE /api/v1/sizes/1273373/storeId (Delete A Single Store Size Service)", () => {});
});
