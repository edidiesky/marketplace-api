import { MongoMemoryServer } from "mongodb-memory-server";
import { unlinkSync, existsSync } from "fs";
import { join } from "path";

export default async function globalTeardown(): Promise<void> {
  const mongod = (global as Record<string, unknown>)
    .__MONGOD__ as MongoMemoryServer | undefined;
  if (mongod) await mongod.stop();

  const uriFile = join(process.cwd(), ".mongo-test-uri");
  if (existsSync(uriFile)) unlinkSync(uriFile);
}