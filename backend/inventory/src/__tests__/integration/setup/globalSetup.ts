import { MongoMemoryServer } from "mongodb-memory-server";

export default async function globalSetUp(): Promise<void> {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  process.env.DATABASE_URL = uri;
  (global as Record<string, unknown>).__MONGOD__  = mongod
}
