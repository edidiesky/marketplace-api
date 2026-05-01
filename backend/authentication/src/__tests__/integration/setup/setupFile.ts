import mongoose from "mongoose";
import { beforeAll, afterEach, afterAll, jest, beforeEach } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import redisClient from "../mocks/redis";

jest.setTimeout(30000);

beforeAll(async () => {
  const uri = readFileSync(
    join(process.cwd(), ".mongo-test-uri"),
    "utf-8",
  ).trim();

  if (!uri) {
    throw new Error("MongoDB URI file is empty: globalSetup may have failed");
  }

  await mongoose.connect(uri);
});

// beforeEach(() => {
//   jest.spyOn(mongoose, "startSession").mockResolvedValue({
//     withTransaction: async (fn: unknown) =>
//       (fn as (session: undefined) => Promise<unknown>)(undefined),
//     endSession: jest.fn(),
//   } as unknown as mongoose.ClientSession);
// });

beforeEach(() => {
  jest.spyOn(mongoose, "startSession").mockResolvedValue({
    withTransaction: async (fn: unknown) =>
      (fn as (session: undefined) => Promise<unknown>)(undefined),
    endSession: jest.fn(),
    inTransaction: jest.fn().mockReturnValue(false),
    commitTransaction: jest.fn<()=> Promise<undefined>>().mockResolvedValue(undefined),
    abortTransaction: jest.fn<()=> Promise<undefined>>().mockResolvedValue(undefined),
  } as unknown as mongoose.ClientSession);
});

afterEach(async () => {
  await (redisClient as unknown as { flushall: () => Promise<void> }).flushall();

  const db = mongoose.connection.db;
  if (db) {
    const collections = await db.listCollections().toArray();
    await Promise.all(
      collections.map((col) => db.collection(col.name).deleteMany({})),
    );
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});