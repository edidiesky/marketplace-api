import { MongoMemoryServer } from "mongodb-memory-server";

export default async function globalTeardown(): Promise<void> {
  const mongod = (global as Record<string, unknown>)
    .__MONGOD__ as MongoMemoryServer;

  await mongod.stop();
}
