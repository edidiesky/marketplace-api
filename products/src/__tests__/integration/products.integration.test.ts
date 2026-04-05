import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
} from "@jest/globals";

type AnyFn = (...args: unknown[]) => unknown;
type Spy = ReturnType<typeof jest.fn>;
const mockFn = () => jest.fn() as unknown as jest.MockedFunction<AnyFn>;

jest.mock("../../config/redis", () => {
  const RedisMock = require("ioredis-mock");
  return { __esModule: true, default: new RedisMock() };
});

jest.mock("../../utils/metrics", () => {
  const m = mockFn;
  return {
    reqReplyTime: m(),
    measureDatabaseQuery: m().mockImplementation((_op: unknown, fn: unknown) =>
      (fn as () => Promise<unknown>)(),
    ),
    productRegistry: {
      contentType: "text/plain",
    },
    trackError: m(),
    trackCacheHit: m(),
    trackCacheMiss: m(),
  };
});

jest.mock("../../models/Product", () => ({
  __esModule: true,
  default: {
    create: mockFn(),
    find: mockFn(),
    findById: mockFn(),
    findByIdAndUpdate: mockFn(),
    findByIdAndDelete: mockFn(),
    countDocuments: mockFn(),
  },
}));

jest.mock("../../models/OutboxEvent", () => ({
  __esModule: true,
  default: {
    create: jest.fn<()=> Promise<[{}]>>().mockResolvedValue([{ _id: "outbox-1" }]),
  },
}));

jest.mock("../../utils/withTransaction", () => ({
  withTransaction: mockFn().mockImplementation((fn: unknown) =>
    (fn as (session: object) => Promise<unknown>)({}),
  ),
}));

jest.mock("../../middleware/auth.middleware", () => ({
  authenticate: (
    req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
    (req as unknown as Record<string, unknown>).user = {
      userId: "663e1a1d7b2c3d4e5f6a7b8c",
      role: "SELLERS",
      name: "Jane Doe",
      permissions: ["PRODUCT_CREATE", "PRODUCT_UPDATE", "PRODUCT_DELETE"],
      roleLevel: 4,
    };
    next();
  },
}));

jest.mock("../../controllers/es.controller", () => ({
  esController: {
    search: (
      _req: import("express").Request,
      res: import("express").Response,
    ) => res.status(200).json({ data: [] }),
    autoComplete: (
      _req: import("express").Request,
      res: import("express").Response,
    ) => res.status(200).json({ suggestions: [] }),
  },
}));

jest.mock("../../utils/buildQuery", () => ({
  buildQuery: jest.fn<()=> Promise<{}>>().mockResolvedValue({ isDeleted: false }),
}));

import request from "supertest";
import express, { Application } from "express";
import mongoose from "mongoose";
import productRouter from "../../routes/product.routes";
import * as productServiceModule from "../../services/product.service";
import { IProduct } from "../../models/Product";
import { json } from "stream/consumers";

const objectId = () => new mongoose.Types.ObjectId().toString();

function makeProduct(overrides: Partial<IProduct> = {}): IProduct {
  return {
    _id: objectId(),
    ownerId: new mongoose.Types.ObjectId(),
    store: new mongoose.Types.ObjectId(),
    name: "Nike Air Max 90",
    price: 45000,
    images: ["https://cdn.example.com/airmax.jpg"],
    description: "Classic Air Max silhouette.",
    ownerName: "Jane Doe",
    storeName: "Jane Sneakers",
    ownerImage: "https://cdn.example.com/avatar.jpg",
    tenantId: "tenant-1",
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    sku: "NK-AM90-001",
    availableStock: 50,
    thresholdStock: 10,
    trackInventory: true,
    category: ["Footwear", "Sneakers"],
    colors: [{ name: "Black", value: "#000000" }],
    size: [{ name: "UK Size", value: "42" }],
    storeDomain: "jane-sneakers.selleasi.com",
    ...overrides,
  } as IProduct;
}

function validCreateBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Nike Air Max 90",
    storeName: "Jane Sneakers",
    storeDomain: "jane-sneakers",
    price: 45000,
    availableStock: 50,
    thresholdStock: 10,
    trackInventory: true,
    description: "Classic Air Max silhouette.",
    images: ["https://cdn.example.com/airmax.jpg"],
    category: ["Footwear"],
    colors: [{ name: "Black", value: "#000000" }],
    size: [{ name: "UK Size", value: "42" }],
    ...overrides,
  };
}

function buildApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/products", productRouter);
  app.use(
    (
      err: Error & { statusCode?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(err.statusCode ?? 500).json({ error: err.message });
    },
  );
  return app;
}

let serviceSpy: Record<string, Spy>;

beforeAll(() => {
  const svc = (productServiceModule as Record<string, unknown>)
    .default as Record<string, unknown>;

  const spy = (method: string): Spy =>
    jest.spyOn(
      svc as Parameters<typeof jest.spyOn>[0],
      method as never,
    ) as unknown as Spy;

  serviceSpy = {
    CreateProductService: spy("CreateProductService"),
    getAllProducts: spy("getAllProducts"),
    getProductById: spy("getProductById"),
    updateProduct: spy("updateProduct"),
    softDeleteProduct: spy("softDeleteProduct"),
    restoreProduct: spy("restoreProduct"),
  };
});

beforeEach(() => {
  Object.values(serviceSpy).forEach((s) => s.mockReset());
});

const resolve = (spy: Spy, value: unknown) =>
  (spy.mockResolvedValueOnce as jest.MockedFunction<AnyFn>)(value);

const reject = (spy: Spy, value: unknown) =>
  (spy.mockRejectedValueOnce as jest.MockedFunction<AnyFn>)(value);

describe("POST /api/v1/products/:storeid/store", () => {
  const storeId = objectId();

  it("returns 201 and the created product on valid body", async () => {
    const product = makeProduct();
    resolve(serviceSpy.CreateProductService, product);

    const res = await request(buildApp())
      .post(`/api/v1/products/${storeId}/store`)
      .send(validCreateBody());

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(product.name);
    expect(serviceSpy.CreateProductService).toHaveBeenCalledTimes(1);
    expect(serviceSpy.CreateProductService).toHaveBeenCalledWith(
      "663e1a1d7b2c3d4e5f6a7b8c",
      expect.objectContaining({ name: "Nike Air Max 90" }),
    );
  });

  it("returns 400 when required field name is missing", async () => {
    const res = await request(buildApp())
      .post(`/api/v1/products/${storeId}/store`)
      .send(validCreateBody({ name: undefined }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/name/i);
    expect(serviceSpy.CreateProductService).not.toHaveBeenCalled();
  });

  it("returns 400 when colors array is empty", async () => {
    const res = await request(buildApp())
      .post(`/api/v1/products/${storeId}/store`)
      .send(validCreateBody({ colors: [] }));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/color/i);
  });

  it("returns 400 when size array is empty", async () => {
    const res = await request(buildApp())
      .post(`/api/v1/products/${storeId}/store`)
      .send(validCreateBody({ size: [] }));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/size/i);
  });

  it("returns 400 when category array is empty", async () => {
    const res = await request(buildApp())
      .post(`/api/v1/products/${storeId}/store`)
      .send(validCreateBody({ category: [] }));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/category/i);
  });

  it("returns 500 when service throws", async () => {
    reject(serviceSpy.CreateProductService, new Error("DB connection lost"));

    const res = await request(buildApp())
      .post(`/api/v1/products/${storeId}/store`)
      .send(validCreateBody());

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/DB connection lost/);
  });

  it("passes storeId from path as store ObjectId to service", async () => {
    const product = makeProduct();
    resolve(serviceSpy.CreateProductService, product);

    await request(buildApp())
      .post(`/api/v1/products/${storeId}/store`)
      .send(validCreateBody());

    const callArg = serviceSpy.CreateProductService.mock
      .calls[0][1] as Record<string, mongoose.Types.ObjectId>;
    expect(callArg.store.toString()).toBe(storeId);
  });
});

describe("GET /api/v1/products/:storeid/store", () => {
  const storeId = objectId();

  it("returns 200 with paginated product list", async () => {
    const products = [makeProduct(), makeProduct()];
    resolve(serviceSpy.getAllProducts, {
      success: true,
      data: { products, totalCount: 2, totalPages: 1 },
      statusCode: 200,
    });

    const res = await request(buildApp()).get(
      `/api/v1/products/${storeId}/store`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(2);
    expect(res.body.data.totalCount).toBe(2);
    expect(serviceSpy.getAllProducts).toHaveBeenCalledTimes(1);
  });

  it("uses default page 1 and limit 10 when query params absent", async () => {
    resolve(serviceSpy.getAllProducts, {
      success: true,
      data: { products: [], totalCount: 0, totalPages: 1 },
      statusCode: 200,
    });

    await request(buildApp()).get(`/api/v1/products/${storeId}/store`);

    expect(serviceSpy.getAllProducts).toHaveBeenCalledWith(
      expect.any(Object),
      0,
      10,
    );
  });

  it("calculates skip correctly from page and limit query params", async () => {
    resolve(serviceSpy.getAllProducts, {
      success: true,
      data: { products: [], totalCount: 0, totalPages: 1 },
      statusCode: 200,
    });

    await request(buildApp()).get(
      `/api/v1/products/${storeId}/store?page=3&limit=5`,
    );

    expect(serviceSpy.getAllProducts).toHaveBeenCalledWith(
      expect.any(Object),
      10,
      5,
    );
  });
});

describe("GET /api/v1/products/:id", () => {
  it("returns 200 with product when found", async () => {
    const product = makeProduct();
    resolve(serviceSpy.getProductById, product);

    const res = await request(buildApp()).get(
      `/api/v1/products/${product._id}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.name).toBe(product.name);
    expect(serviceSpy.getProductById).toHaveBeenCalledWith(
      product._id.toString(),
    );
  });

  it("returns null body when product does not exist", async () => {
    resolve(serviceSpy.getProductById, null);

    const res = await request(buildApp()).get(
      `/api/v1/products/${objectId()}`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });
});

describe("PUT /api/v1/products/:id", () => {
  it("returns 200 with updated product", async () => {
    const product = makeProduct();
    const updated = makeProduct({ name: "Nike Air Max 90 White" });
    resolve(serviceSpy.getProductById, product);
    resolve(serviceSpy.updateProduct, updated);

    const res = await request(buildApp())
      .put(`/api/v1/products/${product._id}`)
      .send({ name: "Nike Air Max 90 White" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Nike Air Max 90 White");
    expect(serviceSpy.updateProduct).toHaveBeenCalledWith(
      product._id.toString(),
      expect.objectContaining({ name: "Nike Air Max 90 White" }),
    );
  });

  it("returns 400 when product does not exist", async () => {
    const id = objectId();
    resolve(serviceSpy.getProductById, null);

    const res = await request(buildApp())
      .put(`/api/v1/products/${id}`)
      .send({ name: "Ghost Product" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(new RegExp(id));
    expect(serviceSpy.updateProduct).not.toHaveBeenCalled();
  });

  it("does not call updateProduct when getProductById returns null", async () => {
    resolve(serviceSpy.getProductById, null);

    await request(buildApp())
      .put(`/api/v1/products/${objectId()}`)
      .send({ price: 99999 });

    expect(serviceSpy.updateProduct).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/v1/products/:id", () => {
  it("returns 200 with soft-deleted product when found", async () => {
    const product = makeProduct();
    const deleted = makeProduct({ isDeleted: true });
    resolve(serviceSpy.getProductById, product);
    resolve(serviceSpy.softDeleteProduct, deleted);

    const res = await request(buildApp()).delete(
      `/api/v1/products/${product._id}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.isDeleted).toBe(true);
    expect(serviceSpy.softDeleteProduct).toHaveBeenCalledWith(
      product._id.toString(),
      "663e1a1d7b2c3d4e5f6a7b8c",
    );
  });

  it("returns 400 when product does not exist", async () => {
    const id = objectId();
    resolve(serviceSpy.getProductById, null);

    const res = await request(buildApp()).delete(`/api/v1/products/${id}`);

    expect(res.status).toBe(400);
    expect(serviceSpy.softDeleteProduct).not.toHaveBeenCalled();
  });

  it("passes authenticated userId as deletedBy to softDeleteProduct", async () => {
    const product = makeProduct();
    const deleted = makeProduct({ isDeleted: true });
    resolve(serviceSpy.getProductById, product);
    resolve(serviceSpy.softDeleteProduct, deleted);

    await request(buildApp()).delete(`/api/v1/products/${product._id}`);

    expect(serviceSpy.softDeleteProduct).toHaveBeenCalledWith(
      product._id.toString(),
      "663e1a1d7b2c3d4e5f6a7b8c",
    );
  });
});

describe("POST /api/v1/products/:id/restore", () => {
  it("returns 200 with restored product", async () => {
    const product = makeProduct({ isDeleted: false });
    resolve(serviceSpy.getProductById, makeProduct({ isDeleted: true }));
    resolve(serviceSpy.restoreProduct, product);

    const res = await request(buildApp()).post(
      `/api/v1/products/${product._id}/restore`,
    );

    expect(res.status).toBe(200);
    expect(res.body.isDeleted).toBe(false);
    expect(serviceSpy.restoreProduct).toHaveBeenCalledWith(
      product._id.toString(),
    );
  });

  it("returns 400 when product does not exist", async () => {
    const id = objectId();
    resolve(serviceSpy.getProductById, null);

    const res = await request(buildApp()).post(
      `/api/v1/products/${id}/restore`,
    );

    expect(res.status).toBe(400);
    expect(serviceSpy.restoreProduct).not.toHaveBeenCalled();
  });

  it("returns 500 when restoreProduct throws", async () => {
    const product = makeProduct({ isDeleted: true });
    resolve(serviceSpy.getProductById, product);
    reject(serviceSpy.restoreProduct, new Error("Restore failed"));

    const res = await request(buildApp()).post(
      `/api/v1/products/${product._id}/restore`,
    );

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Restore failed/);
  });
});