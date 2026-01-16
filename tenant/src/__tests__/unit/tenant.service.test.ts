import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { Types } from "mongoose";
import Tenant, {
  BillingPlanEnum,
  ITenant,
  TenantStatus,
} from "../../models/Tenant";
import redisClient from "../../config/redis";
import {
  CreateTenantService,
  GetAllStoreTenantService,
  GetASingleTenantService,
  UpdateTenantService,
  DeleteTenantService,
} from "../../services/tenant.service";

// Mock dependencies
jest.mock("../../models/Tenant", () => ({
  create: jest.fn<() => Promise<ITenant>>(),
  find: jest.fn<() => Promise<ITenant[]>>(),
  findById: jest.fn<() => Promise<ITenant>>(),
  findOneAndUpdate: jest.fn<() => Promise<ITenant>>(),
  findByIdAndDelete: jest.fn<() => Promise<"">>(),
}));

jest.mock("../../config/redis", () => ({
  get: jest.fn<() => Promise<string | null>>().mockResolvedValue(null),
  set: jest
    .fn<
      (
        key: string,
        value: string,
        method: string,
        timeout: number
      ) => Promise<string>
    >()
    .mockResolvedValue("OK"),
  del: jest.fn<(key: string) => Promise<number>>().mockResolvedValue(1),
}));

const MockedTenant = Tenant as jest.Mocked<typeof Tenant>;
const MockedRedis = redisClient as jest.Mocked<typeof redisClient>;

describe("Tenant Service Tests", () => {
  const mockUserId = "66c0a27e71a3ea08d6a26f8f";
  const mockStoreId = "66c0a27e71a3ea08d6a26f90";
  const mockOwnerId = "66c0a27e71a3ea08d6a26f91";

  const mockTenantData: ITenant = {
    ownerName: "Test Tenant",
    ownerEmail: "test@gmail.com",
    billingPlan: BillingPlanEnum.FREE,
    ownerId: new Types.ObjectId(mockOwnerId),
    tenantStatus: TenantStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTenant: ITenant = {
    ...mockTenantData,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("CreateTenantService", () => {
    it("should create a Tenant successfully with all fields", async () => {
      (Tenant.create as jest.Mock).mockReturnValue(mockTenant)
      const result = await CreateTenantService(
        mockUserId,
        mockTenantData
      );

      expect(MockedTenant.create).toHaveBeenCalledWith({
        user: new Types.ObjectId(mockUserId),
        ...mockTenantData,
      });
      expect(result).toEqual(mockTenant);
    });

    it("should handle creation failure", async () => {
      MockedTenant.create.mockRejectedValue(new Error("DB Error"));

      await expect(
        CreateTenantService(mockUserId, mockTenantData)
      ).rejects.toThrow("DB Error");
    });
  });

  describe("GetAllTenantService", () => {
    it("should return cached Tenants when cache result exists", async () => {
      const cachedTenants = [mockTenant];
      const query = { name: "test" };
      const page = 0;
      const limit = 10;
      const cacheKey = `Tenant:search:${JSON.stringify({
        ...query,
        skip: page,
        limit,
      })}`;
      MockedRedis.get.mockResolvedValueOnce(JSON.stringify(cachedTenants));

      const result = await GetAllStoreTenantService(query, page, limit);

      expect(MockedRedis.get).toHaveBeenCalledWith(cacheKey);
      expect(result).toEqual(cachedTenants);
      expect(MockedTenant.find).not.toHaveBeenCalled();
    });

    it("should fetch and cache Tenants when cache is empty", async () => {
      const tenantsOutcome:ITenant[] = [mockTenant];
      const query = { store: mockStoreId };
      const page = 0;
      const limit = 10;
      const cacheKey = `Tenant:search:${JSON.stringify({
        ...query,
        skip: page,
        limit,
      })}`;

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn<()=> Promise<ITenant[]>().mockResolvedValue(tenantsOutcome),
      };
      MockedRedis.get.mockResolvedValueOnce(null);
      MockedTenant.find.mockReturnValue(mockQuery as any);

      const result = await GetAllStoreTenantService(query, page, limit);

      expect(MockedTenant.find).toHaveBeenCalledWith(query);
      expect(mockQuery.skip).toHaveBeenCalledWith(page);
      expect(mockQuery.limit).toHaveBeenCalledWith(limit);
      expect(mockQuery.sort).toHaveBeenCalledWith("-createdAt");
      expect(mockQuery.lean).toHaveBeenCalled();
      expect(MockedRedis.set).toHaveBeenCalledWith(
        cacheKey,
        JSON.stringify(tenantsOutcome),
        "EX",
        3600
      );
      expect(result).toEqual(tenantsOutcome);
    });

    it("should handle empty results with caching", async () => {
      const Tenants: ITenant[] = [];
      const query = { name: "nonexistent" };
      const page = 0;
      const limit = 10;
      const cacheKey = `Tenant:search:${JSON.stringify({
        ...query,
        skip: page,
        limit,
      })}`;

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(Tenants),
      };
      MockedRedis.get.mockResolvedValueOnce(null);
      MockedTenant.find.mockReturnValue(mockQuery as any);

      const result = await GetAllStoreTenantService(query, page, limit);

      expect(result).toEqual([]);
      expect(MockedRedis.set).toHaveBeenCalledWith(
        cacheKey,
        JSON.stringify(Tenants),
        "EX",
        3600
      );
    });
  });

  describe("GetASingleTenantService", () => {
    it("should return cached Tenant when available", async () => {
      const cacheKey = `Tenant:${mockOwnerId}`;
      MockedRedis.get.mockResolvedValueOnce(JSON.stringify(mockTenant));

      const result = await GetASingleTenantService(mockOwnerId);

      expect(MockedRedis.get).toHaveBeenCalledWith(cacheKey);
      expect(result).toEqual(mockTenant);
      expect(MockedTenant.findById).not.toHaveBeenCalled();
    });

    it("should fetch and cache Tenant when not cached", async () => {
      const cacheKey = `Tenant:${mockOwnerId}`;
      MockedRedis.get.mockResolvedValueOnce(null);
      MockedTenant.findById.mockResolvedValue(mockTenant);

      const result = await GetASingleTenantService(mockOwnerId);

      expect(MockedTenant.findById).toHaveBeenCalledWith(mockOwnerId);
      expect(MockedRedis.set).toHaveBeenCalledWith(
        cacheKey,
        JSON.stringify(mockTenant),
        "EX",
        3600
      );
      expect(result).toEqual(mockTenant);
    });

    it("should return null when Tenant does not exist", async () => {
      MockedRedis.get.mockResolvedValueOnce(null);
      MockedTenant.findById.mockResolvedValue(null);

      const result = await GetASingleTenantService(mockOwnerId);

      expect(result).toBeNull();
      expect(MockedRedis.set).not.toHaveBeenCalled();
    });
  });

  describe("UpdateTenantService", () => {
    it("should update Tenant successfully", async () => {
      const updateData = { price: 150, description: "Updated description" };
      const updatedTenant = { ...mockTenant, ...updateData };
      MockedTenant.findByIdAndUpdate.mockResolvedValue(updatedTenant);

      const result = await UpdateTenantService(mockOwnerId, updateData);

      expect(MockedTenant.findByIdAndUpdate).toHaveBeenCalledWith(
        mockOwnerId,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(updatedTenant);
      expect(result?.price).toBe(150);
    });

    it("should return null when Tenant not found", async () => {
      MockedTenant.findByIdAndUpdate.mockResolvedValue(null);

      const result = await UpdateTenantService(mockOwnerId, { price: 150 });

      expect(result).toBeNull();
    });
  });

  describe("DeleteTenantService", () => {
    it("should delete Tenant and clear cache successfully", async () => {
      const cacheKey = `Tenant:${mockOwnerId}`;
      MockedTenant.findByIdAndDelete.mockResolvedValue(mockTenant);

      const result = await DeleteTenantService(mockOwnerId);

      expect(MockedTenant.findByIdAndDelete).toHaveBeenCalledWith(mockOwnerId);
      expect(MockedRedis.del).toHaveBeenCalledWith(cacheKey);
      expect(result).toBe("Tenant has been deleted");
    });

    it("should handle deletion failure gracefully", async () => {
      const cacheKey = `Tenant:${mockOwnerId}`;
      MockedTenant.findByIdAndDelete.mockResolvedValue(null);

      const result = await DeleteTenantService(mockOwnerId);

      expect(MockedTenant.findByIdAndDelete).toHaveBeenCalledWith(mockOwnerId);
      expect(MockedRedis.del).toHaveBeenCalledWith(cacheKey);
      expect(result).toBe("Tenant has been deleted");
    });
  });
});
