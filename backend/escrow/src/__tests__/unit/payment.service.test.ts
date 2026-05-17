import { jest, describe, beforeAll, afterAll, it } from "@jest/globals";
import Payment, { IPayment } from "../../models/Payment";
import redisClient from "../../config/redis";

// MOCKING THE DB METHODS
jest.mock("../../models/Payment", () => ({
  findOne: jest.fn<(id: string) => Promise<IPayment>>(),
  updateOne:
    jest.fn<(id: string, body: Partial<IPayment>) => Promise<IPayment>>(),
  create: jest.fn<(body: Partial<IPayment>) => Promise<IPayment>>(),
  find: jest.fn<() => Promise<IPayment[]>>(),
  deleteOne: jest.fn<(id: string) => Promise<void>>(),
}));
// MOCKING REDIS METHODS
jest.mock("../../config/redis", () => ({
  get: jest.fn<(id: string) => Promise<"Ok">>().mockResolvedValue("Ok"),
  set: jest.fn<
    (
      key: string,
      value: string,
      secondsToken: "EX",
      seconds: number | string
    ) => Promise<"OK">
  >().mockResolvedValue("OK"),
  del: jest.fn<(id: string) => Promise<number>>().mockResolvedValue(1),
}));

// MOCKING REDIS INSTANCES
const mockedRedis = redisClient as jest.Mocked<typeof redisClient>;
// MOCKING DB INSTANCES
const mockedPayment = Payment as jest.Mocked<typeof Payment>;


// TESTS CUITES

describe("Payment Service Unit Tests", ()=> {})
