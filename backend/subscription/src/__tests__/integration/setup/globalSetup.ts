import { MongoMemoryServer } from "mongodb-memory-server";
import { writeFileSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";
import path from "path";

export default async function globalSetup(): Promise<void> {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  (global as Record<string, unknown>).__MONGOD__ = mongod;
  writeFileSync(join(process.cwd(), ".mongo-test-uri"), uri, "utf-8");
}