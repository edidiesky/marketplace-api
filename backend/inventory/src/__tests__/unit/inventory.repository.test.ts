import {
  beforeEach,
  afterEach,
  it,
  describe,
  jest,
  expect,
} from "@jest/globals";
import Inventory, { IInventory } from "../../models/Inventory";
import * as redisClient from "../../config/redis";
import { InventoryRepository } from "../../repository/InventoryRepository";
import mongoose, { Types } from "mongoose";


const objectId = () => new Types.ObjectId();
const makeInventory = (data: Partial<IInventory> = {}): IInventory => {
  return {
    _id: objectId(),
    ownerId: objectId(),
    productId: objectId(),
    storeId: objectId(),
    warehouseId: objectId(),
    productTitle: "Test Product",
    warehouseName: "Ade Store",
    ownerName: "Ade Store",
    storeName: "Ade Store",
    storeDomain: "Ade Store",
    ownerEmail: "AdeStore@gmail.com",
    productImage: "https://cdn.example.com/img.jpg",
    createdAt: new Date(),
    updatedAt: new Date(),
    quantityAvailable: 50,
    quantityReserved: 10,
    quantityOnHand: 30,
    reorderPoint: 8,
    reorderQuantity: 18,
    __v:4,
    ...data,
  };
};

function chainSkipLimitSortLeanExec<T>(value: T) {
  return {
    skip: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: () => ({
            exec: jest.fn<() => Promise<T>>().mockResolvedValue(value),
          }),
        }),
      }),
    }),
  };
}

// mock db, and redis
jest.mock("../../models/Inventory", () => ({
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../../config/redis", () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
}));

describe("Inventory Repositry Unit Test", () => {
  let repoSession = {} as mongoose.ClientSession;
  let repo: InventoryRepository;
  let redisSpy: {
    get: jest.SpiedFunction<any>;
    set: jest.SpiedFunction<any>;
    del: jest.SpiedFunction<any>;
    keys: jest.SpiedFunction<any>;
  };

  beforeEach(() => {
    repo = new InventoryRepository();
    redisSpy = {
      get: jest.spyOn(redisClient as any, "get"),
      set: jest.spyOn(redisClient as any, "set"),
      del: jest.spyOn(redisClient as any, "del"),
      keys: jest.spyOn(redisClient as any, "keys"),
    };
  });
  afterEach(() => {
    redisSpy.get.mockRestore();
    redisSpy.set.mockRestore();
    redisSpy.del.mockRestore();
    redisSpy.keys.mockRestore();
  });

  describe("getStoreInventory", () => {
    const query = {};
    it("returns cached inventories on cache it, without hitting Mongodb", async () => {
      let inventories = [makeInventory(), makeInventory()];
      let cached = JSON.parse(JSON.stringify(inventories));
      redisSpy.get.mockResolvedValueOnce(JSON.stringify(inventories));

      // act
      const result = await repo.getStoreInventory(query, 0, 10);
      // assert
      expect(result).toHaveLength(2);
      expect(result).toEqual(cached);
      expect(Inventory.find).not.toHaveBeenCalled();
    });

    it("queries MongoDB for data during cache miss", async () => {
      let inventories = [makeInventory(), makeInventory()];
      redisSpy.get.mockResolvedValueOnce(null);
      jest
        .mocked(Inventory.find)
        .mockReturnValueOnce(chainSkipLimitSortLeanExec(inventories) as any);

      // act
      const result = await repo.getStoreInventory(query, 0, 10);
      // assert
      expect(result).toEqual(inventories);
    });

    it("writes to Redis when data was fetched from MongoDB for data during cache miss", async () => {
      let inventories = [makeInventory(), makeInventory()];
      redisSpy.get.mockResolvedValueOnce(null);
      jest
        .mocked(Inventory.find)
        .mockReturnValueOnce(chainSkipLimitSortLeanExec(inventories) as any);

      // act
      const result = await repo.getStoreInventory(query, 0, 10);
      // assert
      expect(redisSpy.set).toHaveBeenCalledWith(
        expect.stringContaining("inventory:"),
        JSON.stringify(inventories),
        "EX",
        300,
      );
    });
  });
});

