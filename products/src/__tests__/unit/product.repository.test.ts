import { ProductRepository } from "../../repository/ProductRepository";
import Product, { IProduct } from "../../models/Product";
import mongoose from "mongoose";
import {
  beforeEach,
  afterEach,
  describe,
  expect,
  jest,
  it,
} from "@jest/globals";
import * as redisModule from "../../config/redis";

//  objectId helpe

const objectId = () => new mongoose.Types.ObjectId();

//  makeProduct fixture

function makeProduct(overrides: Partial<IProduct> = {}): IProduct {
  return {
    _id: objectId(),
    ownerId: objectId(),
    store: objectId(),
    name: "Test Product",
    price: 1000,
    images: ["https://cdn.example.com/img.jpg"],
    description: "A test product",
    ownerName: "Jane Doe",
    storeName: "Jane Store",
    ownerImage: "https://cdn.example.com/avatar.jpg",
    tenantId: "tenant-1",
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    sku: "SKU-001",
    availableStock: 50,
    thresholdStock: 10,
    trackInventory: true,
    ...overrides,
  } as IProduct;
}

//  Mongoose model mock

jest.mock("../../models/Product", () => ({
  __esModule: true,
  default: {
    create:            jest.fn(),
    find:              jest.fn(),
    findById:          jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments:    jest.fn(),
  },
}));

//  Redis mock
jest.mock("../../config/redis", () => ({
  get:  jest.fn(),
  set:  jest.fn(),
  del:  jest.fn(),
  keys: jest.fn(),
  quit: jest.fn(),
}));

// Product.find(q).skip(n).limit(n).sort().lean().exec()
// Product.findByIdAndUpdate(id, data, opts).exec()

function chainLeanExec<T>(value: T) {
  return {
    lean: () => ({ exec: jest.fn<() => Promise<T>>().mockResolvedValue(value) }),
  };
}

function chainSkipLimitSortLeanExec<T>(value: T) {
  return {
    skip: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: () => ({ exec: jest.fn<() => Promise<T>>().mockResolvedValue(value) }),
        }),
      }),
    }),
  };
}

function chainExec<T>(value: T) {
  return { exec: jest.fn<() => Promise<T>>().mockResolvedValue(value) };
}

//  Tests

describe("ProductRepository", () => {
  let repo: ProductRepository;
  let redisSpy: {
    get:  jest.SpiedFunction<any>;
    set:  jest.SpiedFunction<any>;
    del:  jest.SpiedFunction<any>;
    keys: jest.SpiedFunction<any>;
  };
  const fakeSession = {} as mongoose.ClientSession;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new ProductRepository();

    redisSpy = {
      get:  jest.spyOn(redisModule as any, "get"),
      set:  jest.spyOn(redisModule as any, "set"),
      del:  jest.spyOn(redisModule as any, "del"),
      keys: jest.spyOn(redisModule as any, "keys"),
    };
  });

  afterEach(() => {
    redisSpy.get.mockRestore();
    redisSpy.set.mockRestore();
    redisSpy.del.mockRestore();
    redisSpy.keys.mockRestore();
  });

  //  findProductById

  describe("findProductById", () => {
   it("returns cached product on hit — never queries MongoDB", async () => {
  const product = makeProduct();
  // Round-trip through JSON to match what the repository actually returns
  // from cache — dates become ISO strings, ObjectIds become plain strings
  const cached = JSON.parse(JSON.stringify(product));
  redisSpy.get.mockResolvedValueOnce(JSON.stringify(product));

  const result = await repo.findProductById(product._id.toString());

  expect(result).toEqual(cached);
  expect(Product.findById).not.toHaveBeenCalled();
});

    it("queries MongoDB and writes to cache on miss", async () => {
      const product = makeProduct();
      redisSpy.get.mockResolvedValueOnce(null);
      jest.mocked(Product.findById).mockReturnValueOnce(
        chainLeanExec(product) as any,
      );
      redisSpy.set.mockResolvedValueOnce("OK" as never);

      const result = await repo.findProductById(product._id.toString());

      expect(result).toEqual(product);
      expect(Product.findById).toHaveBeenCalledWith(product._id.toString());
      expect(redisSpy.set).toHaveBeenCalledWith(
        `product:${product._id}`,
        JSON.stringify(product),
        "EX",
        3600,
      );
    });

    it("does not write to cache when MongoDB returns null", async () => {
      redisSpy.get.mockResolvedValueOnce(null);
      jest.mocked(Product.findById).mockReturnValueOnce(
        chainLeanExec(null) as any,
      );

      const result = await repo.findProductById(objectId().toString());

      expect(result).toBeNull();
      expect(redisSpy.set).not.toHaveBeenCalled();
    });

    it("degrades to MongoDB when Redis GET throws", async () => {
      const product = makeProduct();
      redisSpy.get.mockRejectedValueOnce(new Error("ECONNREFUSED") as never);
      jest.mocked(Product.findById).mockReturnValueOnce(
        chainLeanExec(product) as any,
      );
      // cache write also fails — should still not throw
      redisSpy.set.mockRejectedValueOnce(new Error("ECONNREFUSED") as never);

      const result = await repo.findProductById(product._id.toString());

      expect(result).toEqual(product);
    });
  });

  //  findAllProduct
  describe("findAllProduct", () => {
    const query = { store: new mongoose.Types.ObjectId(), isDeleted: false };

    it("returns cached list on hit — never queries MongoDB", async () => {
      const products = [makeProduct(), makeProduct()];
      redisSpy.get.mockResolvedValueOnce(JSON.stringify(products));

      const result = await repo.findAllProduct(query, 0, 10);

      expect(result).toHaveLength(2);
      expect(Product.find).not.toHaveBeenCalled();
    });

    it("queries MongoDB with correct skip and limit on miss", async () => {
      const products = [makeProduct()];
      redisSpy.get.mockResolvedValueOnce(null);
      jest.mocked(Product.find).mockReturnValueOnce(
        chainSkipLimitSortLeanExec(products) as any,
      );
      redisSpy.set.mockResolvedValueOnce("OK" as never);

      const result = await repo.findAllProduct(query, 20, 5);

      expect(result).toEqual(products);
      const chain = jest.mocked(Product.find).mock.results[0].value as any;
      expect(chain.skip).toHaveBeenCalledWith(20);
      expect(chain.skip().limit).toHaveBeenCalledWith(5);
    });

    it("writes result to cache with correct TTL after DB query", async () => {
      const products = [makeProduct()];
      redisSpy.get.mockResolvedValueOnce(null);
      jest.mocked(Product.find).mockReturnValueOnce(
        chainSkipLimitSortLeanExec(products) as any,
      );

      await repo.findAllProduct(query, 0, 10);

      expect(redisSpy.set).toHaveBeenCalledWith(
        expect.stringContaining("product:"),
        JSON.stringify(products),
        "EX",
        3600,
      );
    });

    it("degrades to MongoDB when Redis GET throws", async () => {
      const products = [makeProduct()];
      redisSpy.get.mockRejectedValueOnce(new Error("Redis down") as never);
      jest.mocked(Product.find).mockReturnValueOnce(
        chainSkipLimitSortLeanExec(products) as any,
      );
      redisSpy.set.mockRejectedValueOnce(new Error("Redis down") as never);

      const result = await repo.findAllProduct(query, 0, 10);

      expect(result).toEqual(products);
    });
  });

  //  createProduct

  describe("createProduct", () => {
    it("creates product and returns it", async () => {
      const product = makeProduct();
      jest.mocked(Product.create).mockResolvedValueOnce([product] as any);
      redisSpy.keys.mockResolvedValueOnce([] as never);

      const result = await repo.createProduct({ ...product }, fakeSession);

      expect(result).toEqual(product);
      expect(Product.create).toHaveBeenCalledWith(
        [expect.objectContaining({ name: product.name })],
        { session: fakeSession },
      );
    });

    it("invalidates search cache after create", async () => {
      const product = makeProduct();
      jest.mocked(Product.create).mockResolvedValueOnce([product] as any);
      redisSpy.keys.mockResolvedValueOnce([
        `product:${product.ownerId}:search:abc`,
        `product:${product.ownerId}:search:def`,
      ] as never);
      redisSpy.del.mockResolvedValueOnce(2 as never);

      await repo.createProduct({ ...product }, fakeSession);

      expect(redisSpy.keys).toHaveBeenCalledWith(
        expect.stringContaining(":search:*"),
      );
      expect(redisSpy.del).toHaveBeenCalledWith([
        `product:${product.ownerId}:search:abc`,
        `product:${product.ownerId}:search:def`,
      ]);
    });

    it("skips del when no search cache keys found", async () => {
      const product = makeProduct();
      jest.mocked(Product.create).mockResolvedValueOnce([product] as any);
      redisSpy.keys.mockResolvedValueOnce([] as never);

      await repo.createProduct({ ...product }, fakeSession);

      expect(redisSpy.del).not.toHaveBeenCalled();
    });

    it("does not throw when Redis keys() fails during invalidation", async () => {
      const product = makeProduct();
      jest.mocked(Product.create).mockResolvedValueOnce([product] as any);
      redisSpy.keys.mockRejectedValueOnce(
        new Error("ECONNREFUSED") as never,
      );

      await expect(
        repo.createProduct({ ...product }, fakeSession),
      ).resolves.toEqual(product);
    });

    it("throws when Product.create fails", async () => {
      jest
        .mocked(Product.create)
        .mockRejectedValueOnce(new Error("E11000 duplicate key") as never);

      await expect(
        repo.createProduct({ name: "X", price: 100 }, fakeSession),
      ).rejects.toThrow("E11000 duplicate key");
    });
  });

  //  updateProduct

  describe("updateProduct", () => {
    it("updates and returns the product", async () => {
      const product = makeProduct();
      jest
        .mocked(Product.findByIdAndUpdate)
        .mockReturnValueOnce(chainExec(product) as any);
      redisSpy.del.mockResolvedValueOnce(1 as never);
      redisSpy.keys.mockResolvedValueOnce([] as never);

      const result = await repo.updateProduct(product._id.toString(), {
        name: "New Name",
      });

      expect(result).toEqual(product);
      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        product._id.toString(),
        { $set: { name: "New Name" } },
        { new: true, runValidators: true },
      );
    });

    it("invalidates single product cache key after update", async () => {
      const product = makeProduct();
      jest
        .mocked(Product.findByIdAndUpdate)
        .mockReturnValueOnce(chainExec(product) as any);
      redisSpy.del.mockResolvedValueOnce(1 as never);
      redisSpy.keys.mockResolvedValueOnce([] as never);

      await repo.updateProduct(product._id.toString(), { price: 9999 });

      expect(redisSpy.del).toHaveBeenCalledWith(
        expect.stringContaining(`product:${product._id}`),
      );
    });

    it("returns null and skips all cache ops when product not found", async () => {
      jest
        .mocked(Product.findByIdAndUpdate)
        .mockReturnValueOnce(chainExec(null) as any);

      const result = await repo.updateProduct(objectId().toString(), {
        name: "Ghost",
      });

      expect(result).toBeNull();
      expect(redisSpy.del).not.toHaveBeenCalled();
    });
  });

  //  deleteproductById

  describe("deleteproductById", () => {
    it("returns early without DB call when product not found", async () => {
      redisSpy.get.mockResolvedValueOnce(null);
      jest
        .mocked(Product.findById)
        .mockReturnValueOnce(chainLeanExec(null) as any);

      await repo.deleteproductById(objectId().toString());

      expect(Product.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it("deletes product and invalidates cache when found", async () => {
      const product = makeProduct();
      // findProductById: cache miss → DB hit → cache write
      redisSpy.get.mockResolvedValueOnce(null);
      jest
        .mocked(Product.findById)
        .mockReturnValueOnce(chainLeanExec(product) as any);
      redisSpy.set.mockResolvedValueOnce("OK" as never);
      // hard delete
      jest
        .mocked(Product.findByIdAndDelete)
        .mockReturnValueOnce(chainExec(product) as any);
      redisSpy.del.mockResolvedValueOnce(1 as never);
      redisSpy.keys.mockResolvedValueOnce([] as never);

      await repo.deleteproductById(product._id.toString());

      expect(Product.findByIdAndDelete).toHaveBeenCalledWith(
        product._id.toString(),
      );
      expect(redisSpy.del).toHaveBeenCalled();
    });
  });

  //  softDeleteProduct

  describe("softDeleteProduct", () => {
    it("calls findByIdAndUpdate with isDeleted fields and session", async () => {
      const id = objectId().toString();
      const deletedBy = objectId().toString();
      jest
        .mocked(Product.findByIdAndUpdate)
        .mockResolvedValueOnce(undefined as any);

      await repo.softDeleteProduct(id, deletedBy, fakeSession);

      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        expect.objectContaining({
          isDeleted: true,
          deletedAt: expect.any(Date),
          deletedBy: expect.any(mongoose.Types.ObjectId),
        }),
        { session: fakeSession },
      );
    });

    it("casts deletedBy string to ObjectId", async () => {
      const id = objectId().toString();
      const deletedBy = objectId().toString();
      jest
        .mocked(Product.findByIdAndUpdate)
        .mockResolvedValueOnce(undefined as any);

      await repo.softDeleteProduct(id, deletedBy, fakeSession);

      const updateArg = jest.mocked(Product.findByIdAndUpdate).mock
        .calls[0][1] as any;
      expect(updateArg.deletedBy).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(updateArg.deletedBy.toString()).toBe(deletedBy);
    });
  });

  //  restoreProduct

  describe("restoreProduct", () => {
    it("clears isDeleted, deletedAt, deletedBy and returns product", async () => {
      const product = makeProduct({ isDeleted: false });
      jest
        .mocked(Product.findByIdAndUpdate)
        .mockResolvedValueOnce(product as any);

      const result = await repo.restoreProduct(
        product._id.toString(),
        fakeSession,
      );

      expect(result?.isDeleted).toBe(false);
      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        product._id.toString(),
        expect.objectContaining({
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
        }),
        { new: true, session: fakeSession },
      );
    });

    it("returns null when product not found", async () => {
      jest
        .mocked(Product.findByIdAndUpdate)
        .mockResolvedValueOnce(null as any);

      const result = await repo.restoreProduct(
        objectId().toString(),
        fakeSession,
      );

      expect(result).toBeNull();
    });
  });

  //  invalidateSearchCache edge cases 

  describe("invalidateSearchCache", () => {
    it("does not throw when del throws after keys returns results", async () => {
      const product = makeProduct();
      jest.mocked(Product.create).mockResolvedValueOnce([product] as any);
      redisSpy.keys.mockResolvedValueOnce(["product:abc:search:1"] as never);
      redisSpy.del.mockRejectedValueOnce(
        new Error("Redis del failed") as never,
      );

      await expect(
        repo.createProduct({ ...product }, fakeSession),
      ).resolves.toEqual(product);
    });
  });
});