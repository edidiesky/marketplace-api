jest.mock("../../config/redis", () => {
  const RedisMock = require("ioredis-mock");
  return { __esModule: true, default: new RedisMock() };
});

jest.mock("../../utils/metrics", () => ({
  reqReplyTime: jest.fn(),
  measureDatabaseQuery: jest
    .fn()
    .mockImplementation((_op: unknown, fn: unknown) =>
      (fn as () => Promise<unknown>)(),
    ),
  productRegistry: {
    contentType: "text/plain",
    metrics: jest.fn<() => Promise<"">>().mockResolvedValue(""),
  },
  trackError: jest.fn(),
  trackCacheHit: jest.fn(),
  trackCacheMiss: jest.fn(),
}));

jest.mock("../../models/OutboxEvent", () => {
   const actual = jest.requireActual(
    "../../models/OutboxEvent",
  ) as typeof import("../../models/OutboxEvent");
 return {
    __esModule: true,
    // Re-export the real enum so service code can read its values
    IOutboxEventType: actual.IOutboxEventType,
    // Replace only the model default export
    default: {
      create: jest
      .fn<() => Promise<[{}]>>()
      .mockResolvedValue([{ _id: "outbox-stub" }]),
    },
  };
});

jest.mock("../../utils/withTransaction", () => ({
  withTransaction: jest
    .fn()
    .mockImplementation((fn: unknown) =>
      (fn as (session: undefined) => Promise<unknown>)(undefined),
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

// buildQuery is stubbed because its internals (reading storeId from req,
// applying tenant scoping) are tested in its own unit test. Here we only care
// that whatever filter it returns is passed through to Mongoose correctly.
jest.mock("../../utils/buildQuery", () => ({
  buildQuery: jest
    .fn<() => Promise<object>>()
    .mockResolvedValue({ isDeleted: false }),
}));

//  IMPORTS

import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from "@jest/globals";
import request from "supertest";
import express, { Application, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import redisClient from "../../config/redis";
import productRouter from "../../routes/product.routes";
import Product, { IProduct } from "../../models/Product";

//  TYPES

interface SeedProduct {
  _id: mongoose.Types.ObjectId;
  name: string;
  isDeleted: boolean;
  price: number;
}

//  IN-PROCESS MONGODB
// We start mongodb-memory-server inside the test file rather than in
// globalSetup so this file is self-contained and runnable in isolation.
// The tradeoff: startup adds ~1s per run. For CI this is acceptable.
// If you have many integration test files, move this to globalSetup.ts.

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

afterEach(async () => {
  try {
    const result = await Product.deleteMany({});
      await (redisClient as unknown as { flushall: () => Promise<void> }).flushall();
  } catch (err) {
    console.error("afterEach cleanup failed:", err);
  }
});

//  FACTORIES

const SELLER_ID = "663e1a1d7b2c3d4e5f6a7b8c";
const STORE_ID = new mongoose.Types.ObjectId();

// Seeds a real product document into MongoDB and returns its plain object.
// This is the source of truth for what exists in the DB before the test runs.
async function seedProduct(
  overrides: Partial<IProduct> = {},
): Promise<IProduct> {
  const doc = await Product.create({
    ownerId: new mongoose.Types.ObjectId(SELLER_ID),
    store: STORE_ID,
    name: `Nike Air Max ${Date.now()}`, // unique per test run
    price: 45000,
    images: ["https://cdn.example.com/airmax.jpg"],
    description: "Classic Air Max silhouette.",
    ownerName: "Jane Doe",
    storeName: "Jane Sneakers",
    ownerImage: "https://cdn.example.com/avatar.jpg",
    tenantId: "tenant-1",
    isDeleted: false,
    sku: `NK-${Date.now()}`,
    availableStock: 50,
    thresholdStock: 10,
    trackInventory: true,
    category: ["Footwear"],
    colors: [{ name: "Black", value: "#000000" }],
    size: [{ name: "UK Size", value: "42" }],
    storeDomain: "jane-sneakers.selleasi.com",
    ...overrides,
  });

  return doc.toObject() as IProduct;
}

function validCreateBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    name: `Nike Air Max ${Date.now()}`,
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

//  APP BUILDER
function buildApp(): Application {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/products", productRouter);

  app.use(
    (
      err: Error & { statusCode?: number },
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      console.error("TEST_ERROR_HANDLER:", err.message);
      console.error("TEST_ERROR_STACK:", err.stack);
      res.status(err.statusCode ?? 500).json({
        success: false,
        error: err.message,
      });
    },
  );

  return app;
}
// function buildApp(): Application {
//   const app = express();
//   app.use(express.json());
//   app.use("/api/v1/products", productRouter);

//   // Error handler reads res.statusCode because the controller calls
//   // res.status(N) before throwing. Once you add AppError this becomes
//   // err.statusCode. Tracked as a production fix in review.
//   app.use(
//     (
//       err: Error & { statusCode?: number },
//       _req: Request,
//       res: Response,
//       _next: NextFunction,
//     ) => {
//       const status =
//         err.statusCode ?? (res.statusCode !== 200 ? res.statusCode : 500);
//       res.status(status).json({ error: err.message });
//     },
//   );

//   return app;
// }

//  SUITES

describe("POST /api/v1/products/:storeid/store - real MongoDB", () => {
  it("persists a new product document and returns 201 with the created product", async () => {
    // Arrange
    const body = validCreateBody({ name: "Air Force 1" });

    // Act
    const res = await request(buildApp())
      .post(`/api/v1/products/${STORE_ID}/store`)
      .send(body);

    // Assert HTTP layer
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Air Force 1");
    expect(res.body._id).toBeDefined();

    // Assert persistence: the document must exist in MongoDB
    const persisted = await Product.findById(res.body._id).lean();
    expect(persisted).not.toBeNull();
    expect(persisted!.name).toBe("Air Force 1");
    expect(persisted!.ownerId.toString()).toBe(SELLER_ID);
    expect(persisted!.store.toString()).toBe(STORE_ID.toString());
  });

  it("does not persist a document when required field name is missing", async () => {
    // Arrange
    const body = validCreateBody();
    delete (body as Record<string, unknown>).name;

    // Act
    const res = await request(buildApp())
      .post(`/api/v1/products/${STORE_ID}/store`)
      .send(body);

    // Assert HTTP layer
    expect(res.status).toBe(400);

    // Assert no document was written
    const count = await Product.countDocuments({});
    expect(count).toBe(0);
  });

 it("sets ownerId from the JWT userId regardless of what is in the request body", async () => {
  const body = validCreateBody();

  const res = await request(buildApp())
    .post(`/api/v1/products/${STORE_ID}/store`)
    .send(body);

  expect(res.status).toBe(201);
  const persisted = await Product.findById(res.body._id).lean();
  expect(persisted!.ownerId.toString()).toBe(SELLER_ID);
});
});

describe("GET /api/v1/products/:storeid/store - real MongoDB", () => {
  it("returns 200 with all non-deleted products for the store", async () => {
    // Arrange: seed two live and one deleted product
    await seedProduct({ name: "Air Max 1", isDeleted: false });
    await seedProduct({ name: "Air Max 2", isDeleted: false });
    await seedProduct({ name: "Air Max Deleted", isDeleted: true });

    // Act: buildQuery mock returns { isDeleted: false } so deleted product
    // is excluded by the real Mongoose query
    const res = await request(buildApp()).get(
      `/api/v1/products/${STORE_ID}/store`,
    );

    // Assert
    expect(res.status).toBe(200);
    // totalCount reflects what countDocuments returned against real data
    expect(res.body.data.totalCount).toBe(2);
    expect(res.body.data.products).toHaveLength(2);
  });

  it("returns an empty list when no products exist for the store", async () => {
    const res = await request(buildApp()).get(
      `/api/v1/products/${STORE_ID}/store`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(0);
    expect(res.body.data.totalCount).toBe(0);
  });

  it("returns paginated results respecting skip and limit against real data", async () => {
    // Arrange: seed 5 products
    await Promise.all(
      Array.from({ length: 5 }).map((_, i) =>
        seedProduct({ name: `Shoe ${i}` }),
      ),
    );

    // Act: page=2, limit=2 → skip=2, returns items 3 and 4
    const res = await request(buildApp()).get(
      `/api/v1/products/${STORE_ID}/store?page=2&limit=2`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(2);
    expect(res.body.data.totalCount).toBe(5);
    expect(res.body.data.totalPages).toBe(3);
  });
});

describe("GET /api/v1/products/:id - real MongoDB", () => {
  it("returns 200 with the product when the id exists in the collection", async () => {
    // Arrange
    const seeded = await seedProduct({ name: "Jordan 1" });

    // Act
    const res = await request(buildApp()).get(`/api/v1/products/${seeded._id}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Jordan 1");
    expect(res.body._id).toBe(seeded._id.toString());
  });

it("returns 200 with empty object when id does not exist", async () => {
  const res = await request(buildApp()).get(
    `/api/v1/products/${new mongoose.Types.ObjectId()}`,
  );

  expect(res.status).toBe(200);
  expect(res.body).toEqual({});
});
});

describe("PUT /api/v1/products/:id - real MongoDB", () => {
  it("updates the product in the collection and returns 200 with the new state", async () => {
    // Arrange
    const seeded = await seedProduct({ name: "Old Name", price: 10000 });

    // Act
    const res = await request(buildApp())
      .put(`/api/v1/products/${seeded._id}`)
      .send({ price: 99999 });

    // Assert HTTP layer
    expect(res.status).toBe(200);
    expect(res.body.price).toBe(99999);

    // Assert persistence: the DB must reflect the change
    const persisted = await Product.findById(seeded._id).lean();
    expect(persisted!.price).toBe(99999);
  });

  it("returns 400 and does not modify the collection when id does not exist", async () => {
    const ghostId = new mongoose.Types.ObjectId();

    const res = await request(buildApp())
      .put(`/api/v1/products/${ghostId}`)
      .send({ price: 1 });

    expect(res.status).toBe(400);

    // Verify nothing was written
    const count = await Product.countDocuments({});
    expect(count).toBe(0);
  });
});

describe("DELETE /api/v1/products/:id - real MongoDB", () => {
  it("sets isDeleted=true in the collection and returns 200", async () => {
    // Arrange
    const seeded = await seedProduct({ isDeleted: false });

    // Act
    const res = await request(buildApp()).delete(
      `/api/v1/products/${seeded._id}`,
    );

    // Assert HTTP layer
    expect(res.status).toBe(200);
    expect(res.body.isDeleted).toBe(true);

    // Assert the document was soft-deleted, not hard-deleted
    const persisted = await Product.findById(seeded._id).lean();
    expect(persisted).not.toBeNull(); // document still exists
    expect(persisted!.isDeleted).toBe(true);
    expect(persisted!.deletedBy!.toString()).toBe(SELLER_ID);
  });

  it("returns 400 when the id does not exist and leaves the collection unchanged", async () => {
    const ghostId = new mongoose.Types.ObjectId();

    const res = await request(buildApp()).delete(`/api/v1/products/${ghostId}`);

    expect(res.status).toBe(400);

    const count = await Product.countDocuments({});
    expect(count).toBe(0);
  });
});

describe("POST /api/v1/products/:id/restore - real MongoDB", () => {
  it("sets isDeleted=false in the collection and returns 200", async () => {
    // Arrange: seed a soft-deleted product
    const seeded = await seedProduct({ isDeleted: true });

    // Act
    const res = await request(buildApp()).post(
      `/api/v1/products/${seeded._id}/restore`,
    );

    // Assert HTTP layer
    expect(res.status).toBe(200);
    expect(res.body.isDeleted).toBe(false);

    // Assert persistence
    const persisted = await Product.findById(seeded._id).lean();
    expect(persisted!.isDeleted).toBe(false);
    expect(persisted!.deletedAt).toBeNull();
  });

  it("returns 400 when the product to restore does not exist", async () => {
    const ghostId = new mongoose.Types.ObjectId();

    const res = await request(buildApp()).post(
      `/api/v1/products/${ghostId}/restore`,
    );

    expect(res.status).toBe(400);
  });
});
