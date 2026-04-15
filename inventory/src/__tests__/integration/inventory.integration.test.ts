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
  InventoryRegistry: {
    contentType: "text/plain",
    metrics: jest.fn<() => Promise<"">>().mockResolvedValue(""),
  },
  trackError: jest.fn(),
  trackCacheHit: jest.fn(),
  trackCacheMiss: jest.fn(),
}));

jest.mock("../../middleware/auth.middleware", () => ({
  authenticate: (
    req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => {
    (req as unknown as Record<string, unknown>).user = {
      userId: SELLER_ID,
      role: "SELLERS",
      name: "Jane Doe",
      permissions: ["INVENTORY_CREATE", "INVENTORY_UPDATE", "INVENTORY_DELETE"],
      roleLevel: 4,
    };
    next();
  },
}));

jest.mock("../../middleware/internal.middleware", () => ({
  internalOnly: (
    _req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => next(),
}));

import { describe, it, expect, jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import Inventory from "../../models/Inventory";

import { buildApp } from "../integration/helpers/buildApp";
import {
  seedInventory,
  SELLER_ID,
  DEFAULT_STORE_ID,
  DEFAULT_PRODUCT_ID,
} from "../integration/helpers/seeders";
import { validInventoryCreateBody } from "../integration/helpers/requestBodies";

//  SUITES

// POST /api/v1/inventories/:storeId/store
describe("POST /api/v1/inventories/:storeId/store", () => {
  it("persists a new inventory document and returns 201 with the created document", async () => {
    // Arrange
    const body = {
      productId: new mongoose.Types.ObjectId().toString(),
      ownerId: SELLER_ID,
      quantityOnHand: 100,
      reorderPoint: 10,
      reorderQuantity: 50,
      productTitle: "Nike Air Max",
      storeName: "Jane Sneakers",
      storeDomain: "jane-sneakers.selleasi.com",
      ownerName: "Jane Doe",
      ownerEmail: "jane@example.com",
    };

    // Act
    const res = await request(buildApp())
      .post(`/api/v1/inventories/${DEFAULT_STORE_ID}/store`)
      .send(body);

    // Assert HTTP
    expect(res.status).toBe(201);
    expect(res.body._id).toBeDefined();

    // Assert persistence
    const persisted = await Inventory.findById(res.body._id).lean();
    expect(persisted).not.toBeNull();
    expect(persisted!.storeId.toString()).toBe(DEFAULT_STORE_ID.toString());
    expect(persisted!.quantityOnHand).toBe(100);
    expect(persisted!.quantityAvailable).toBe(100);
    expect(persisted!.quantityReserved).toBe(0);
  });

  it("enforces the accounting invariant on creation: quantityOnHand equals quantityAvailable plus quantityReserved", async () => {
    // Arrange
    const body = {
      productId: new mongoose.Types.ObjectId().toString(),
      ownerId: SELLER_ID,
      quantityOnHand: 75,
      reorderPoint: 10,
    };

    // Act
    const res = await request(buildApp())
      .post(`/api/v1/inventories/${DEFAULT_STORE_ID}/store`)
      .send(body);

    // Assert
    expect(res.status).toBe(201);

    const persisted = await Inventory.findById(res.body._id).lean();
    // quantityAvailable is set to quantityOnHand on creation
    // quantityReserved defaults to 0
    expect(persisted!.quantityOnHand).toBe(
      persisted!.quantityAvailable + persisted!.quantityReserved,
    );
  });

  it("returns 400 when required field productId is missing", async () => {
    const body = {
      ownerId: SELLER_ID,
      quantityOnHand: 100,
    };

    const res = await request(buildApp())
      .post(`/api/v1/inventories/${DEFAULT_STORE_ID}/store`)
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/productId/i);
    expect(await Inventory.countDocuments({})).toBe(0);
  });

  it("returns 400 when required field quantityOnHand is missing", async () => {
    const body = {
      productId: new mongoose.Types.ObjectId().toString(),
      ownerId: SELLER_ID,
    };

    const res = await request(buildApp())
      .post(`/api/v1/inventories/${DEFAULT_STORE_ID}/store`)
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/quantityOnHand/i);
    expect(await Inventory.countDocuments({})).toBe(0);
  });

  it("returns 400 when quantityOnHand is negative", async () => {
    const body = {
      productId: new mongoose.Types.ObjectId().toString(),
      ownerId: SELLER_ID,
      quantityOnHand: -1,
    };

    const res = await request(buildApp())
      .post(`/api/v1/inventories/${DEFAULT_STORE_ID}/store`)
      .send(body);

    expect(res.status).toBe(400);
    expect(await Inventory.countDocuments({})).toBe(0);
  });
});
// GET /api/v1/inventories/:storeId/store
describe("GET /api/v1/inventories/:storeId/store", () => {
  it("returns 200 with only inventory records belonging to the requested store", async () => {
    // Arrange: seed records for two different stores
    const otherStoreId = new mongoose.Types.ObjectId();
    await seedInventory({ storeId: DEFAULT_STORE_ID });
    await seedInventory({ storeId: DEFAULT_STORE_ID });
    await seedInventory({ storeId: otherStoreId });

    // Act
    const res = await request(buildApp()).get(
      `/api/v1/inventories/${DEFAULT_STORE_ID}/store`,
    );

    // Assert: buildQuery scopes by storeId from URL param
    expect(res.status).toBe(200);
    expect(res.body.data.inventories).toHaveLength(2);
    expect(res.body.data.totalCount).toBe(2);
  });

  it("returns 200 with an empty list when no inventory exists for the store", async () => {
    const res = await request(buildApp()).get(
      `/api/v1/inventories/${DEFAULT_STORE_ID}/store`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.inventories).toHaveLength(0);
    expect(res.body.data.totalCount).toBe(0);
  });

  it("paginates correctly: page=2 limit=2 returns items 3 and 4 of 5", async () => {
    // Arrange
    await Promise.all(Array.from({ length: 5 }).map(() => seedInventory()));

    // Act
    const res = await request(buildApp()).get(
      `/api/v1/inventories/${DEFAULT_STORE_ID}/store?page=2&limit=2`,
    );

    // Assert: skip=(2-1)*2=2, limit=2, total=5, pages=ceil(5/2)=3
    expect(res.status).toBe(200);
    expect(res.body.data.inventories).toHaveLength(2);
    expect(res.body.data.totalCount).toBe(5);
    expect(res.body.data.totalPages).toBe(3);
  });
});

// GET /api/v1/inventories/:id

describe("GET /api/v1/inventories/:id", () => {
  it("returns 200 with the inventory document when the id exists", async () => {
    // Arrange
    const seeded = await seedInventory();

    // Act
    const res = await request(buildApp()).get(
      `/api/v1/inventories/${seeded._id}`,
    );

    // Assert
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(seeded._id.toString());
    expect(res.body.quantityAvailable).toBe(seeded.quantityAvailable);
  });

  it("returns 200 with null when the id does not exist", async () => {
    const res = await request(buildApp()).get(
      `/api/v1/inventories/${new mongoose.Types.ObjectId()}`,
    );

    expect(res.status).toBe(200);
  });
});

// GET /api/v1/inventories/check/:productId

describe("GET /api/v1/inventories/check/:productId", () => {
  it("returns 200 with availability data when inventory exists", async () => {
    // Arrange
    const seeded = await seedInventory({
      quantityAvailable: 25,
      quantityReserved: 5,
      quantityOnHand: 30,
    });

    // Act
    const res = await request(buildApp()).get(
      `/api/v1/inventories/check/${seeded.productId}?storeId=${DEFAULT_STORE_ID}`,
    );

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.quantityAvailable).toBe(25);
    expect(res.body.quantityOnHand).toBe(30);
    expect(res.body.quantityReserved).toBe(5);
  });

  it("returns 404 when no inventory exists for the product", async () => {
    const res = await request(buildApp()).get(
      `/api/v1/inventories/check/${new mongoose.Types.ObjectId()}?storeId=${DEFAULT_STORE_ID}`,
    );

    expect(res.status).toBe(404);
    expect(res.body.quantityAvailable).toBe(0);
  });
});

// PUT /api/v1/inventories/:id

describe("PUT /api/v1/inventories/:id", () => {
  it("updates non-accounting fields and returns 200", async () => {
    // Arrange
    const seeded = await seedInventory({ reorderPoint: 10 });

    // Act
    const res = await request(buildApp())
      .put(`/api/v1/inventories/${seeded._id}`)
      .send({ reorderPoint: 25 });

    // Assert HTTP
    expect(res.status).toBe(200);
    expect(res.body.reorderPoint).toBe(25);

    // Assert persistence
    const persisted = await Inventory.findById(seeded._id).lean();
    expect(persisted!.reorderPoint).toBe(25);

    // Assert accounting invariant was not disturbed
    expect(persisted!.quantityOnHand).toBe(
      persisted!.quantityAvailable + persisted!.quantityReserved,
    );
  });

  it("returns 400 and leaves collection unchanged when id does not exist", async () => {
    const res = await request(buildApp())
      .put(`/api/v1/inventories/${new mongoose.Types.ObjectId()}`)
      .send({ reorderPoint: 25 });

    expect(res.status).toBe(400);
    expect(await Inventory.countDocuments({})).toBe(0);
  });
});

// DELETE /api/v1/inventories/:id

describe("DELETE /api/v1/inventories/:id", () => {
  it("hard-deletes the document and returns 200", async () => {
    // Arrange
    const seeded = await seedInventory();

    // Act
    const res = await request(buildApp()).delete(
      `/api/v1/inventories/${seeded._id}`,
    );

    // Assert HTTP
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Inventory deleted successfully");

    // Assert the document no longer exists
    const persisted = await Inventory.findById(seeded._id).lean();
    expect(persisted).toBeNull();
  });

  it("returns 400 and leaves collection unchanged when id does not exist", async () => {
    const res = await request(buildApp()).delete(
      `/api/v1/inventories/${new mongoose.Types.ObjectId()}`,
    );

    expect(res.status).toBe(400);
    expect(await Inventory.countDocuments({})).toBe(0);
  });
});

// POST /api/v1/inventories/reserve
// Critical invariant: quantityAvailable never goes below zero
// Critical invariant: quantityOnHand = quantityAvailable + quantityReserved
// Critical invariant: same sagaId never double-reserves

describe("POST /api/v1/inventories/reserve", () => {
  it("decrements quantityAvailable and increments quantityReserved by the requested quantity", async () => {
    // Arrange
    const seeded = await seedInventory({
      quantityAvailable: 50,
      quantityReserved: 0,
      quantityOnHand: 50,
    });

    // Act
    const res = await request(buildApp())
      .post("/api/v1/inventories/reserve")
      .send({
        productId: seeded.productId.toString(),
        storeId: DEFAULT_STORE_ID.toString(),
        quantity: 10,
        userId: SELLER_ID,
        sagaId: "saga-reserve-001",
      });

    // Assert HTTP
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.quantityReserved).toBe(10);
    expect(res.body.remainingAvailable).toBe(40);

    // Assert persistence
    const persisted = await Inventory.findById(seeded._id).lean();
    expect(persisted!.quantityAvailable).toBe(40);
    expect(persisted!.quantityReserved).toBe(10);

    // Assert accounting invariant
    expect(persisted!.quantityOnHand).toBe(
      persisted!.quantityAvailable + persisted!.quantityReserved,
    );
  });

  it("returns 400 and does not modify inventory when quantityAvailable is less than requested quantity", async () => {
    // Arrange: only 5 available, requesting 10
    const seeded = await seedInventory({
      quantityAvailable: 5,
      quantityReserved: 0,
      quantityOnHand: 5,
    });

    // Act
    const res = await request(buildApp())
      .post("/api/v1/inventories/reserve")
      .send({
        productId: seeded.productId.toString(),
        storeId: DEFAULT_STORE_ID.toString(),
        quantity: 10,
        userId: SELLER_ID,
        sagaId: "saga-oversell-001",
      });

    // Assert HTTP: zero oversell
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.availableStock).toBe(5);

    // Assert persistence: inventory unchanged
    const persisted = await Inventory.findById(seeded._id).lean();
    expect(persisted!.quantityAvailable).toBe(5);
    expect(persisted!.quantityReserved).toBe(0);
  });

  it("returns 400 when quantityAvailable is exactly zero", async () => {
    // Arrange: completely out of stock
    const seeded = await seedInventory({
      quantityAvailable: 0,
      quantityReserved: 10,
      quantityOnHand: 10,
    });

    // Act
    const res = await request(buildApp())
      .post("/api/v1/inventories/reserve")
      .send({
        productId: seeded.productId.toString(),
        storeId: DEFAULT_STORE_ID.toString(),
        quantity: 1,
        userId: SELLER_ID,
        sagaId: "saga-zero-stock-001",
      });

    // Assert: zero oversell enforced
    expect(res.status).toBe(400);
    expect(res.body.availableStock).toBe(0);

    // Assert persistence unchanged
    const persisted = await Inventory.findById(seeded._id).lean();
    expect(persisted!.quantityAvailable).toBe(0);
    expect(persisted!.quantityReserved).toBe(10);
    expect(persisted!.quantityOnHand).toBe(10);
  });

  it("is idempotent: same sagaId does not double-reserve", async () => {
    // Arrange
    const seeded = await seedInventory({
      quantityAvailable: 50,
      quantityReserved: 0,
      quantityOnHand: 50,
    });

    const body = {
      productId: seeded.productId.toString(),
      storeId: DEFAULT_STORE_ID.toString(),
      quantity: 10,
      userId: SELLER_ID,
      sagaId: "saga-idempotent-001",
    };

    // Act: send the same reservation twice
    await request(buildApp()).post("/api/v1/inventories/reserve").send(body);
    const res = await request(buildApp())
      .post("/api/v1/inventories/reserve")
      .send(body);

    // Assert: second call succeeds (idempotent return) but does not double-deduct
    expect(res.status).toBe(201);

    // Assert persistence: only 10 reserved, not 20
    const persisted = await Inventory.findById(seeded._id).lean();
    expect(persisted!.quantityAvailable).toBe(40);
    expect(persisted!.quantityReserved).toBe(10);

    // Assert accounting invariant
    expect(persisted!.quantityOnHand).toBe(
      persisted!.quantityAvailable + persisted!.quantityReserved,
    );
  });

  it("returns 400 when required field sagaId is missing", async () => {
    const res = await request(buildApp())
      .post("/api/v1/inventories/reserve")
      .send({
        productId: DEFAULT_PRODUCT_ID.toString(),
        storeId: DEFAULT_STORE_ID.toString(),
        quantity: 10,
        userId: SELLER_ID,
        // sagaId intentionally omitted
      });

    expect(res.status).toBe(400);
    expect(await Inventory.countDocuments({})).toBe(0);
  });

  it("returns 400 when quantity is zero", async () => {
    const res = await request(buildApp())
      .post("/api/v1/inventories/reserve")
      .send({
        productId: DEFAULT_PRODUCT_ID.toString(),
        storeId: DEFAULT_STORE_ID.toString(),
        quantity: 0,
        userId: SELLER_ID,
        sagaId: "saga-zero-qty-001",
      });

    expect(res.status).toBe(400);
  });
});

// POST /api/v1/inventories/release
// Critical invariant: quantityAvailable + quantityReserved = quantityOnHand after release

describe("POST /api/v1/inventories/release", () => {
  it("increments quantityAvailable and decrements quantityReserved by the released quantity", async () => {
    // Arrange: inventory with an active reservation
    const seeded = await seedInventory({
      quantityAvailable: 40,
      quantityReserved: 10,
      quantityOnHand: 50,
    });

    // Act
    const res = await request(buildApp())
      .post("/api/v1/inventories/release")
      .send({
        productId: seeded.productId.toString(),
        storeId: DEFAULT_STORE_ID.toString(),
        quantity: 10,
        userId: SELLER_ID,
        sagaId: "saga-release-001",
      });

    // Assert HTTP
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.releasedQuantity).toBe(10);
    expect(res.body.newAvailable).toBe(50);
    expect(res.body.remainingReserved).toBe(0);

    // Assert persistence
    const persisted = await Inventory.findById(seeded._id).lean();
    expect(persisted!.quantityAvailable).toBe(50);
    expect(persisted!.quantityReserved).toBe(0);

    // Assert accounting invariant
    expect(persisted!.quantityOnHand).toBe(
      persisted!.quantityAvailable + persisted!.quantityReserved,
    );
  });

  it("returns 400 when attempting to release more than currently reserved", async () => {
    // Arrange: only 5 reserved, attempting to release 10
    const seeded = await seedInventory({
      quantityAvailable: 45,
      quantityReserved: 5,
      quantityOnHand: 50,
    });

    // Act
    const res = await request(buildApp())
      .post("/api/v1/inventories/release")
      .send({
        productId: seeded.productId.toString(),
        storeId: DEFAULT_STORE_ID.toString(),
        quantity: 10,
        userId: SELLER_ID,
        sagaId: "saga-over-release-001",
      });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    // Assert persistence unchanged
    const persisted = await Inventory.findById(seeded._id).lean();
    expect(persisted!.quantityAvailable).toBe(45);
    expect(persisted!.quantityReserved).toBe(5);
  });
});

// POST /api/v1/inventories/commit
// Critical invariant: commit decrements both quantityReserved and quantityOnHand
// quantityAvailable must NOT change during commit

describe("POST /api/v1/inventories/commit", () => {
  it("decrements quantityReserved and quantityOnHand without touching quantityAvailable", async () => {
    // Arrange: inventory with an active reservation
    const seeded = await seedInventory({
      quantityAvailable: 40,
      quantityReserved: 10,
      quantityOnHand: 50,
    });

    // Act
    const res = await request(buildApp())
      .post("/api/v1/inventories/commit")
      .send({
        productId: seeded.productId.toString(),
        storeId: DEFAULT_STORE_ID.toString(),
        quantity: 10,
        userId: SELLER_ID,
        sagaId: "saga-commit-001",
      });

    // Assert HTTP
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.committedQuantity).toBe(10);
    expect(res.body.remainingOnHand).toBe(40);
    expect(res.body.remainingReserved).toBe(0);

    // Assert persistence
    const persisted = await Inventory.findById(seeded._id).lean();
    expect(persisted!.quantityReserved).toBe(0);
    expect(persisted!.quantityOnHand).toBe(40);

    // CRITICAL: quantityAvailable must not change during commit
    // Available was already decremented during reserve.
    // Commit only removes from reserved and onHand.
    expect(persisted!.quantityAvailable).toBe(40);

    // Assert accounting invariant
    expect(persisted!.quantityOnHand).toBe(
      persisted!.quantityAvailable + persisted!.quantityReserved,
    );
  });

  it("returns 404 when the reservation does not exist", async () => {
    // Arrange: no reservation in the inventory
    const seeded = await seedInventory({
      quantityAvailable: 50,
      quantityReserved: 0,
      quantityOnHand: 50,
    });

    // Act
    const res = await request(buildApp())
      .post("/api/v1/inventories/commit")
      .send({
        productId: seeded.productId.toString(),
        storeId: DEFAULT_STORE_ID.toString(),
        quantity: 10,
        userId: SELLER_ID,
        sagaId: "saga-no-reservation-001",
      });

    // Assert: RESERVATION_NOT_FOUND maps to 404
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("verifies the full reserve then commit cycle leaves correct final state", async () => {
    // Arrange: starting inventory
    const seeded = await seedInventory({
      quantityAvailable: 100,
      quantityReserved: 0,
      quantityOnHand: 100,
    });

    const body = {
      productId: seeded.productId.toString(),
      storeId: DEFAULT_STORE_ID.toString(),
      quantity: 20,
      userId: SELLER_ID,
    };

    // Act: reserve then commit
    await request(buildApp())
      .post("/api/v1/inventories/reserve")
      .send({ ...body, sagaId: "saga-cycle-001" });

    await request(buildApp())
      .post("/api/v1/inventories/commit")
      .send({ ...body, sagaId: "saga-cycle-001" });

    // Assert final state
    const persisted = await Inventory.findById(seeded._id).lean();

    // After reserve: available=80, reserved=20, onHand=100
    // After commit: available=80, reserved=0, onHand=80
    expect(persisted!.quantityAvailable).toBe(80);
    expect(persisted!.quantityReserved).toBe(0);
    expect(persisted!.quantityOnHand).toBe(80);

    // Assert accounting invariant
    expect(persisted!.quantityOnHand).toBe(
      persisted!.quantityAvailable + persisted!.quantityReserved,
    );
  });

  it("verifies the full reserve then release cycle leaves correct final state", async () => {
    // Arrange: starting inventory
    const seeded = await seedInventory({
      quantityAvailable: 100,
      quantityReserved: 0,
      quantityOnHand: 100,
    });

    const body = {
      productId: seeded.productId.toString(),
      storeId: DEFAULT_STORE_ID.toString(),
      quantity: 20,
      userId: SELLER_ID,
    };

    // Act: reserve then release (payment failed scenario)
    await request(buildApp())
      .post("/api/v1/inventories/reserve")
      .send({ ...body, sagaId: "saga-release-cycle-001" });

    await request(buildApp())
      .post("/api/v1/inventories/release")
      .send({ ...body, sagaId: "saga-release-cycle-001" });

    // Assert final state: back to original
    const persisted = await Inventory.findById(seeded._id).lean();
    expect(persisted!.quantityAvailable).toBe(100);
    expect(persisted!.quantityReserved).toBe(0);
    expect(persisted!.quantityOnHand).toBe(100);

    expect(persisted!.quantityOnHand).toBe(
      persisted!.quantityAvailable + persisted!.quantityReserved,
    );
  });
});
