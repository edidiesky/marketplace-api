/**
 * Integration tests — full HTTP request/response cycle.
 *
 * Infrastructure:
 *   - mongodb-memory-server  : real MongoDB in-process, no external dependency
 *   - ioredis-mock            : in-memory Redis, no external dependency
 *   - Kafka producer          : mocked — fire-and-forget is tested but not real Kafka
 *   - authenticate middleware : stubbed — injects test user, no JWT verification
 *
 * What this covers that unit tests cannot:
 *   - Express routing, param parsing, query string handling
 *   - Joi validation middleware rejections
 *   - HTML sanitization applied before DB write
 *   - Redis cache read → DB fallback → cache write cycle
 *   - MongoDB document persistence and query correctness
 *   - Soft delete state visible in DB after handler returns
 *   - Error handler shape for 400/404/500
 */

import request from "supertest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import {afterAll, beforeAll, beforeEach, describe, expect, it, jest} from '@jest/globals'
import {app} from '../../app'
import { sendProductMessage } from "../../messaging/producer";

// Global test user

const TEST_USER = {
  userId: new Types.ObjectId().toString(),
  role: "SELLER",
  name: "Test User",
  email: "test@example.com",
};


// Stub authenticate
jest.mock("../src/middleware/auth.middleware", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = TEST_USER;
    next();
  },
}));

// Kafka producer
jest.mock("../src/messaging/producer", () => ({
  sendProductMessage: jest.fn<()=> Promise<any>>().mockResolvedValue(),
  connectProducer: jest.fn().mockResolvedValue(any),
  disconnectProducer: jest.fn().mockResolvedValue(any),
}));

// Redis
jest.mock("../src/config/redis", () => {
  const Redis = require("ioredis-mock");
  return new Redis();
});

// MongoDB in-process replica set
// Replica set required for MongoDB transactions (withTransaction uses sessions)

let mongoServer: MongoMemoryReplSet;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60_000);


afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clean all collections between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  jest.clearAllMocks();
});

// Fixture

const storeId = new Types.ObjectId().toString();

function productBody(overrides: Record<string, any> = {}) {
  return {
    name: "Leather Wallet",
    price: 4500,
    images: ["https://cdn.example.com/img.jpg"],
    description: "A genuine leather wallet",
    availableStock: 50,
    thresholdStock: 10,
    trackInventory: true,
    storeName: "Test Store",
    ...overrides,
  };
}

async function createProductViaApi(overrides: Record<string, any> = {}) {
  const res = await request(app)
    .post(`/api/v1/products/${storeId}/store`)
    .send(productBody(overrides));
  return res;
}

// CREATE

describe("POST /api/v1/products/:storeid/store", () => {
  it("returns 201 with created product", async () => {
    const res = await createProductViaApi();

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: "Leather Wallet",
      price: 4500,
      isDeleted: false,
    });
    expect(res.body._id).toBeDefined();
  });

  it("sets ownerId from authenticated user, not from body", async () => {
    const res = await createProductViaApi({ ownerId: new Types.ObjectId() });

    expect(res.status).toBe(201);
    expect(res.body.ownerId).toBe(TEST_USER.userId);
  });

  it("strips XSS from description", async () => {
    const res = await createProductViaApi({
      description: '<script>alert("xss")</script><p>Safe text</p>',
    });

    expect(res.status).toBe(201);
    expect(res.body.description).not.toContain("<script>");
    expect(res.body.description).toContain("<p>Safe text</p>");
  });

  it("emits Kafka message on successful creation", async () => {
    const res = await createProductViaApi();

    expect(res.status).toBe(201);
    expect(sendProductMessage).toHaveBeenCalledTimes(1);
    expect(sendProductMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        productId: res.body._id,
        storeId,
      })
    );
  });

  it("returns 201 even when Kafka send fails — fire-and-forget", async () => {
    (sendProductMessage as jest.Mock).mockRejectedValueOnce(
      new Error("Kafka broker unavailable")
    );

    const res = await createProductViaApi({ name: "Kafka Fail Product" });

    // Product was persisted
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Kafka Fail Product");
  });

  it("returns 400 when name is too short (Joi)", async () => {
    const res = await createProductViaApi({ name: "AB" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when price is negative", async () => {
    const res = await createProductViaApi({ price: -100 });

    expect(res.status).toBe(400);
  });

  it("returns 400 when images array is empty", async () => {
    const res = await createProductViaApi({ images: [] });

    expect(res.status).toBe(400);
  });

  it("returns 400 when description exceeds 500 chars", async () => {
    const res = await createProductViaApi({ description: "x".repeat(501) });

    expect(res.status).toBe(400);
  });

  it("returns 400 on duplicate product name in same store", async () => {
    await createProductViaApi({ name: "Duplicate Product" });
    const res = await createProductViaApi({ name: "Duplicate Product" });

    expect(res.status).toBe(400);
  });
});

// GET ALL

describe("GET /api/v1/products/:storeid/store", () => {
  beforeEach(async () => {
    // Seed 3 products
    await createProductViaApi({ name: "Product Alpha", price: 1000 });
    await createProductViaApi({ name: "Product Beta", price: 2000 });
    await createProductViaApi({ name: "Product Gamma", price: 3000 });
  });

  it("returns paginated list with totalCount and totalPages", async () => {
    const res = await request(app)
      .get(`/api/v1/products/${storeId}/store`)
      .query({ page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(3);
    expect(res.body.data.totalCount).toBe(3);
    expect(res.body.data.totalPages).toBe(1);
    expect(res.body.success).toBe(true);
  });

  it("respects page and limit params", async () => {
    const res = await request(app)
      .get(`/api/v1/products/${storeId}/store`)
      .query({ page: 1, limit: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(2);
    expect(res.body.data.totalPages).toBe(2); // ceil(3/2)
  });

  it("returns page 2 with remaining item", async () => {
    const res = await request(app)
      .get(`/api/v1/products/${storeId}/store`)
      .query({ page: 2, limit: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(1);
  });

  it("filters by name (case-insensitive regex)", async () => {
    const res = await request(app)
      .get(`/api/v1/products/${storeId}/store`)
      .query({ name: "alpha" });

    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(1);
    expect(res.body.data.products[0].name).toBe("Product Alpha");
  });

  it("returns empty list when no products match filter", async () => {
    const res = await request(app)
      .get(`/api/v1/products/${storeId}/store`)
      .query({ name: "nonexistent" });

    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(0);
  });

  it("does not return soft-deleted products by default", async () => {
    // Create and delete a product
    const createRes = await createProductViaApi({ name: "To Be Deleted" });
    await request(app).delete(`/api/v1/products/${createRes.body._id}`);

    const res = await request(app)
      .get(`/api/v1/products/${storeId}/store`)
      .query({ isDeleted: false });

    const names = res.body.data.products.map((p: any) => p.name);
    expect(names).not.toContain("To Be Deleted");
  });

  it("returns different pages — no duplicate products across pages", async () => {
    const page1 = await request(app)
      .get(`/api/v1/products/${storeId}/store`)
      .query({ page: 1, limit: 2 });

    const page2 = await request(app)
      .get(`/api/v1/products/${storeId}/store`)
      .query({ page: 2, limit: 2 });

    const ids1 = page1.body.data.products.map((p: any) => p._id);
    const ids2 = page2.body.data.products.map((p: any) => p._id);
    const intersection = ids1.filter((id: string) => ids2.includes(id));

    expect(intersection).toHaveLength(0);
  });
});

// GET SINGLE

describe("GET /api/v1/products/:id", () => {
  it("returns 200 with product data", async () => {
    const createRes = await createProductViaApi();
    const id = createRes.body._id;

    const res = await request(app).get(`/api/v1/products/${id}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(id);
    expect(res.body.name).toBe("Leather Wallet");
  });

  it("returns from cache on second request (cache hit)", async () => {
    const createRes = await createProductViaApi();
    const id = createRes.body._id;

    // First request — DB hit, writes cache
    await request(app).get(`/api/v1/products/${id}`);
    // Second request — should hit cache (no additional DB query)
    const res = await request(app).get(`/api/v1/products/${id}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(id);
  });

  it("returns 400 for non-existent product id", async () => {
    const fakeId = new Types.ObjectId().toString();

    const res = await request(app).get(`/api/v1/products/${fakeId}`);

    expect(res.status).toBe(400);
  });

  it("returns 500 for malformed object id", async () => {
    const res = await request(app).get("/api/v1/products/not-a-valid-objectid");

    expect(res.status).toBe(500);
  });
});

// UPDATE

describe("PUT /api/v1/products/:id", () => {
  it("returns 200 with updated fields", async () => {
    const createRes = await createProductViaApi();
    const id = createRes.body._id;

    const res = await request(app)
      .put(`/api/v1/products/${id}`)
      .send({ name: "Updated Wallet", price: 5000 });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Wallet");
    expect(res.body.price).toBe(5000);
  });

  it("returns 400 when product does not exist", async () => {
    const fakeId = new Types.ObjectId().toString();

    const res = await request(app)
      .put(`/api/v1/products/${fakeId}`)
      .send({ name: "Ghost" });

    expect(res.status).toBe(400);
  });

  it("invalidates cache after update", async () => {
    const createRes = await createProductViaApi();
    const id = createRes.body._id;

    // Prime cache with initial GET
    await request(app).get(`/api/v1/products/${id}`);

    // Update
    await request(app)
      .put(`/api/v1/products/${id}`)
      .send({ name: "Cache Busted Name" });

    // Next GET should return updated data, not stale cache
    const res = await request(app).get(`/api/v1/products/${id}`);

    expect(res.body.name).toBe("Cache Busted Name");
  });
});

// SOFT DELETE

describe("DELETE /api/v1/products/:id", () => {
  it("returns 200 and sets isDeleted: true in DB", async () => {
    const createRes = await createProductViaApi();
    const id = createRes.body._id;

    const deleteRes = await request(app).delete(`/api/v1/products/${id}`);

    expect(deleteRes.status).toBe(200);

    // Verify DB state directly
    const Product = mongoose.model("Product");
    const doc = await Product.findById(id).lean();
    expect((doc as any).isDeleted).toBe(true);
    expect((doc as any).deletedAt).toBeDefined();
    expect((doc as any).deletedBy?.toString()).toBe(TEST_USER.userId);
  });

  it("returns 400 when deleting non-existent product", async () => {
    const fakeId = new Types.ObjectId().toString();

    const res = await request(app).delete(`/api/v1/products/${fakeId}`);

    expect(res.status).toBe(400);
  });

  it("does not appear in listing after soft delete", async () => {
    const createRes = await createProductViaApi({ name: "To Delete" });
    const id = createRes.body._id;

    await request(app).delete(`/api/v1/products/${id}`);

    const listRes = await request(app)
      .get(`/api/v1/products/${storeId}/store`)
      .query({ isDeleted: false });

    const names = listRes.body.data.products.map((p: any) => p.name);
    expect(names).not.toContain("To Delete");
  });
});

// RESTORE
describe("POST /api/v1/products/:id/restore", () => {
  it("restores a soft-deleted product", async () => {
    const createRes = await createProductViaApi();
    const id = createRes.body._id;

    await request(app).delete(`/api/v1/products/${id}`);

    const restoreRes = await request(app).post(
      `/api/v1/products/${id}/restore`
    );

    expect(restoreRes.status).toBe(200);

    const Product = mongoose.model("Product");
    const doc = await Product.findById(id).lean();
    expect((doc as any).isDeleted).toBe(false);
    expect((doc as any).deletedAt).toBeNull();
    expect((doc as any).deletedBy).toBeNull();
  });

  it("returns 400 when restoring non-existent product", async () => {
    const fakeId = new Types.ObjectId().toString();

    const res = await request(app).post(`/api/v1/products/${fakeId}/restore`);

    expect(res.status).toBe(400);
  });
});

// HEALTH

describe("GET /health", () => {
  it("returns 200", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toMatch(/fine|ok|running/i);
  });
});

// FULL LIFECYCLE

describe("Full product lifecycle", () => {
  it("create → read → update → delete → restore", async () => {
    // 1. Create
    const createRes = await createProductViaApi({ name: "Lifecycle Product" });
    expect(createRes.status).toBe(201);
    const id = createRes.body._id;

    // 2. Read
    const readRes = await request(app).get(`/api/v1/products/${id}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.name).toBe("Lifecycle Product");

    // 3. Update
    const updateRes = await request(app)
      .put(`/api/v1/products/${id}`)
      .send({ name: "Lifecycle Product v2", price: 9999 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.price).toBe(9999);

    // 4. Soft delete
    const deleteRes = await request(app).delete(`/api/v1/products/${id}`);
    expect(deleteRes.status).toBe(200);

    // 5. Verify not in listing
    const listRes = await request(app)
      .get(`/api/v1/products/${storeId}/store`)
      .query({ isDeleted: false });
    const ids = listRes.body.data.products.map((p: any) => p._id);
    expect(ids).not.toContain(id);

    // 6. Restore
    const restoreRes = await request(app).post(`/api/v1/products/${id}/restore`);
    expect(restoreRes.status).toBe(200);

    // 7. Verify back in listing
    const listRes2 = await request(app)
      .get(`/api/v1/products/${storeId}/store`)
      .query({ isDeleted: false });
    const ids2 = listRes2.body.data.products.map((p: any) => p._id);
    expect(ids2).toContain(id);
  });
});