import {
  it,
  describe,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { CartRepository } from "../../repository/CartRepository";
import Cart, { ICart } from "../../models/Cart";
import * as redisModule from "../../config/redis";
import mongoose, { Types } from "mongoose";

const objectId = () => new Types.ObjectId();
const makeCart = (cart: Partial<ICart>): ICart => {
  return {
    _id: objectId(),
    sellerId: objectId(),
    userId: objectId(),
    storeId: objectId(),
    fullName: "Test Product",
    totalPrice: 1000,
    quantity: 10,
    version: 10,
    createdAt: new Date(),
    expireAt: new Date(),
    updatedAt: new Date(),
    cartItems: [],
    ...cart,
  };
};
// cart model mock
jest.mock("../../models/Cart", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
  },
}));
// redis mock
jest.mock("../../config/redis", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    quit: jest.fn(),
  },
}));

// repository test suite
describe("Cart Repository Unit Test", () => {
  let repo: CartRepository;
  const fakeSession= {} as mongoose.ClientSession
  let redisSpy: {
    get: jest.SpiedFunction<any>;
    set: jest.SpiedFunction<any>;
    del: jest.SpiedFunction<any>;
    keys: jest.SpiedFunction<any>;
  };
  // beforeEach
  beforeEach(() => {
    jest.clearAllMocks();
    repo = new CartRepository();
    redisSpy = {
      get: jest.spyOn(redisModule as any, "get"),
      set: jest.spyOn(redisModule as any, "set"),
      del: jest.spyOn(redisModule as any, "del"),
      keys: jest.spyOn(redisModule as any, "keys"),
    };
  });
  // afterEach (restoring)
  afterEach(() => {
    redisSpy.get.mockRestore();
    redisSpy.set.mockRestore();
    redisSpy.del.mockRestore();
    redisSpy.keys.mockRestore();
  });

  describe("createCart", ()=> {})
  describe("updateCart", ()=> {})
  describe("getSingleCart", ()=> {})
  describe("deleteCart", ()=> {})
  describe("getStoreCart", ()=> {})
});
