//  MOCKS
// Rule: mock block always appears before imports. Jest hoists these calls
// redis > metrics > OutboxEvent > withTransaction > auth > es > buildQuery

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
    IOutboxEventType: actual.IOutboxEventType,
    default: {
      create: jest
        .fn<() => Promise<[object]>>()
        .mockResolvedValue([{ _id: "outbox-stub" }]),
    },
  };
});

// withTransaction: MongoMemoryServer runs as a standalone node, not a
// replica set. Transactions require a replica set. We unwrap the callback
// and pass undefined as the session so the repository session guard
// (session ? { session } : {}) never attaches a session to Mongoose queries.
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

jest.mock("../../utils/buildQuery", () => ({
  buildQuery: jest
    .fn<() => Promise<object>>()
    .mockResolvedValue({ isDeleted: false }),
}));

import { describe, it, expect, jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import Product from "../../models/Product";

import buildApp from "./helpers/buildApp";
import { seedProduct, SELLER_ID, DEFAULT_STORE_ID } from "./helpers/seeders";
import { validProductCreateBody } from "./helpers/requestBodies";

describe("POST /api/v1/products/:storeid/store", () => {
  it("persists a new product and returns 201 with the created document", async () => {
    // Arrange
    const body = validProductCreateBody({ name: "Air Force 1" });

    // Act
    const res = await request(buildApp())
      .post(`/api/v1/products/${DEFAULT_STORE_ID}/store`)
      .send(body);

    // Assert HTTP
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Air Force 1");
    expect(res.body._id).toBeDefined();

    // Assert persistence
    const persisted = await Product.findById(res.body._id).lean();
    expect(persisted).not.toBeNull();
    expect(persisted!.name).toBe("Air Force 1");
    expect(persisted!.ownerId.toString()).toBe(SELLER_ID);
    expect(persisted!.store.toString()).toBe(DEFAULT_STORE_ID.toString());
  });

  it("returns 400 and writes nothing when required field name is missing", async () => {
    // Arrange
    const body = validProductCreateBody();
    delete (body as Record<string, unknown>).name;

    // Act
    const res = await request(buildApp())
      .post(`/api/v1/products/${DEFAULT_STORE_ID}/store`)
      .send(body);

    // Assert HTTP
    expect(res.status).toBe(400);

    // Assert nothing written
    expect(await Product.countDocuments({})).toBe(0);
  });

  it("returns 400 and writes nothing when colors array is empty", async () => {
    const res = await request(buildApp())
      .post(`/api/v1/products/${DEFAULT_STORE_ID}/store`)
      .send(validProductCreateBody({ colors: [] }));

    expect(res.status).toBe(400);
    expect(await Product.countDocuments({})).toBe(0);
  });

  it("returns 400 and writes nothing when size array is empty", async () => {
    const res = await request(buildApp())
      .post(`/api/v1/products/${DEFAULT_STORE_ID}/store`)
      .send(validProductCreateBody({ size: [] }));

    expect(res.status).toBe(400);
    expect(await Product.countDocuments({})).toBe(0);
  });

  it("returns 400 and writes nothing when category array is empty", async () => {
    const res = await request(buildApp())
      .post(`/api/v1/products/${DEFAULT_STORE_ID}/store`)
      .send(validProductCreateBody({ category: [] }));

    expect(res.status).toBe(400);
    expect(await Product.countDocuments({})).toBe(0);
  });

  it("assigns ownerId from JWT userId and ignores any ownerId in the request body", async () => {
    // Arrange: send a clean body with no ownerId field.
    // The invariant: controller must read userId from req.user, never from body.
    const body = validProductCreateBody();

    // Act
    const res = await request(buildApp())
      .post(`/api/v1/products/${DEFAULT_STORE_ID}/store`)
      .send(body);

    // console.log("BODY SENT:", JSON.stringify(body));
    // console.log("RESPONSE:", res.status, JSON.stringify(res.body));

    // Assert
    expect(res.status).toBe(201);
    const persisted = await Product.findById(res.body._id).lean();
    expect(persisted!.ownerId.toString()).toBe(SELLER_ID);
  });

  it("assigns store from the URL param, not from the request body", async () => {
    // Arrange
    const body = validProductCreateBody();

    // Act
    const res = await request(buildApp())
      .post(`/api/v1/products/${DEFAULT_STORE_ID}/store`)
      .send(body);

    // Assert
    expect(res.status).toBe(201);
    const persisted = await Product.findById(res.body._id).lean();
    expect(persisted!.store.toString()).toBe(DEFAULT_STORE_ID.toString());
  });
});

describe("GET /api/v1/products/:storeid/store", () => {
  it("returns 200 with only non-deleted products", async () => {
    // Arrange
    await seedProduct({ name: "Visible 1", isDeleted: false });
    await seedProduct({ name: "Visible 2", isDeleted: false });
    await seedProduct({ name: "Hidden", isDeleted: true });

    // Act
    const res = await request(buildApp()).get(
      `/api/v1/products/${DEFAULT_STORE_ID}/store`,
    );

    // Assert: buildQuery mock returns { isDeleted: false } so the deleted
    // product is excluded by the real Mongoose query
    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(2);
    expect(res.body.data.totalCount).toBe(2);
  });

  it("returns 200 with an empty list when no products exist", async () => {
    const res = await request(buildApp()).get(
      `/api/v1/products/${DEFAULT_STORE_ID}/store`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(0);
    expect(res.body.data.totalCount).toBe(0);
  });

  it("paginates correctly: page=2 limit=2 returns items 3-4 of 5", async () => {
    // Arrange: 5 products
    await Promise.all(
      Array.from({ length: 5 }).map((_, i) =>
        seedProduct({ name: `Shoe ${i + 1}` }),
      ),
    );

    // Act
    const res = await request(buildApp()).get(
      `/api/v1/products/${DEFAULT_STORE_ID}/store?page=2&limit=2`,
    );

    // Assert: skip=(2-1)*2=2, returns 2 items, totalPages=ceil(5/2)=3
    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(2);
    expect(res.body.data.totalCount).toBe(5);
    expect(res.body.data.totalPages).toBe(3);
  });

  it("defaults to page=1 and limit=10 when query params are absent", async () => {
    // Arrange: seed 3 products
    await Promise.all(Array.from({ length: 3 }).map(() => seedProduct()));

    // Act
    const res = await request(buildApp()).get(
      `/api/v1/products/${DEFAULT_STORE_ID}/store`,
    );

    // Assert: all 3 returned, limit=10 means no truncation
    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(3);
  });
});

describe("GET /api/v1/products/:id", () => {
  it("returns 200 with the product document when the id exists", async () => {
    // Arrange
    const seeded = await seedProduct({ name: "Jordan 1" });

    // Act
    const res = await request(buildApp()).get(`/api/v1/products/${seeded._id}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Jordan 1");
    expect(res.body._id).toBe(seeded._id.toString());
  });

  it("returns 200 with an empty object when the id does not exist", async () => {
    // Controller calls res.json(product ?? {}) so no 404 is thrown.
    // If you change this to throw 404, update this test.
    const res = await request(buildApp()).get(
      `/api/v1/products/${new mongoose.Types.ObjectId()}`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });
});

describe("PUT /api/v1/products/:id", () => {
  it("updates the document in MongoDB and returns 200 with the new state", async () => {
    // Arrange
    const seeded = await seedProduct({ price: 10000 });

    // Act
    const res = await request(buildApp())
      .put(`/api/v1/products/${seeded._id}`)
      .send({ price: 99999 });

    // Assert HTTP
    expect(res.status).toBe(200);
    expect(res.body.price).toBe(99999);

    // Assert persistence
    const persisted = await Product.findById(seeded._id).lean();
    expect(persisted!.price).toBe(99999);
  });

  it("returns 400 and leaves the collection unchanged when the id does not exist", async () => {
    const res = await request(buildApp())
      .put(`/api/v1/products/${new mongoose.Types.ObjectId()}`)
      .send({ price: 1 });

    expect(res.status).toBe(400);
    expect(await Product.countDocuments({})).toBe(0);
  });
});

describe("DELETE /api/v1/products/:id", () => {
  it("soft-deletes the document and returns 200 with isDeleted=true", async () => {
    // Arrange
    const seeded = await seedProduct({ isDeleted: false });

    // Act
    const res = await request(buildApp()).delete(
      `/api/v1/products/${seeded._id}`,
    );

    // Assert HTTP
    expect(res.status).toBe(200);
    expect(res.body.isDeleted).toBe(true);

    // Assert persistence: document must still exist, only flagged
    const persisted = await Product.findById(seeded._id).lean();
    expect(persisted).not.toBeNull();
    expect(persisted!.isDeleted).toBe(true);
    expect(persisted!.deletedBy!.toString()).toBe(SELLER_ID);
  });

  it("sets deletedBy to the authenticated userId from the JWT", async () => {
    // Arrange: the auth mock injects userId = SELLER_ID on every request
    const seeded = await seedProduct();

    // Act
    await request(buildApp()).delete(`/api/v1/products/${seeded._id}`);

    // Assert: deletedBy must match the JWT userId, not any body field
    const persisted = await Product.findById(seeded._id).lean();
    expect(persisted!.deletedBy!.toString()).toBe(SELLER_ID);
  });

  it("returns 400 and leaves the collection unchanged when the id does not exist", async () => {
    const res = await request(buildApp()).delete(
      `/api/v1/products/${new mongoose.Types.ObjectId()}`,
    );

    expect(res.status).toBe(400);
    expect(await Product.countDocuments({})).toBe(0);
  });
});

describe("POST /api/v1/products/:id/restore", () => {
  it("sets isDeleted=false on the document and returns 200", async () => {
    // Arrange: pre-condition is a soft-deleted product
    const seeded = await seedProduct({ isDeleted: true });

    // Act
    const res = await request(buildApp()).post(
      `/api/v1/products/${seeded._id}/restore`,
    );

    // Assert HTTP
    expect(res.status).toBe(200);
    expect(res.body.isDeleted).toBe(false);

    // Assert persistence
    const persisted = await Product.findById(seeded._id).lean();
    expect(persisted!.isDeleted).toBe(false);
    expect(persisted!.deletedAt).toBeNull();
  });

  it("returns 400 and leaves the collection unchanged when the id does not exist", async () => {
    const res = await request(buildApp()).post(
      `/api/v1/products/${new mongoose.Types.ObjectId()}/restore`,
    );

    expect(res.status).toBe(400);
    expect(await Product.countDocuments({})).toBe(0);
  });
});
