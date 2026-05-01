import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll } from "@jest/globals";
import redisClient from "../../../__mocks__/ioredis";

beforeAll(async () => {
  await mongoose.connect(process.env.DATABASE_URL as string);
});
afterEach(async () => {
  await (
    redisClient as unknown as { flushall: () => Promise<void> }
  ).flushall();
  const db = mongoose.connection.db;
  if (db) {
    const connections = await db.listCollections().toArray();
    await Promise.all(
      connections.map((col) => db.collection(col.name).deleteMany({})),
    );
  } 
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});
