import redisClient from "../../../__mocks__/ioredis";
import { afterAll, afterEach, beforeEach } from "@jest/globals";
import mongoose from "mongoose";

beforeEach(async () => {
  await mongoose.connect(process.env.DATABASE_URL as string);
});

afterEach(async () => {
  // drop redis
  await (
    redisClient as unknown as { flushall: () => Promise<void> }
  ).flushall();
  // close mongoose

  const db = mongoose.connection.db;
  if (db) {
    const connections = await db.listCollections().toArray();
    await Promise.all(
      connections.map((col) => db.collection(col.name).deleteMany({})),
    );
  }
});


afterAll(async()=> {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
})