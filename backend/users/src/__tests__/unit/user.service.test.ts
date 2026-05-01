import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import User from "../../models/User";
import redisClient from "../../config/redis";

// Mock module
jest.mock("../models/User");
jest.mock("../config/redis", () => ({
  set: jest
    .fn<
      (
        key: string,
        value: string,
        method: string,
        timeout: number
      ) => Promise<String>
    >()
    .mockResolvedValue("OK"),
  get: jest.fn<(key: string) => Promise<null>>().mockResolvedValue(null),
}));
const MockedUser = jest.mocked<typeof User>
const MockedRedis = redisClient as any
describe("User Service Tests", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe("GET /api/v1/user (GET ALL USER ROUTE)", () => {});
  describe("GET /api/v1/user/:id (GET SINGLE USER ROUTE)", () => {});
  describe("PUT /api/v1/user/:id (UPDATE SINGLE USER ROUTE)", () => {});
  describe("DELETE /api/v1/user/:id (DELETE SINGLE USER ROUTE)", () => {}); //aggregated-agencies
  describe("GET /api/v1/user/aggregation (GET AGGREGATED USER ROUTE)", () => {});
  describe("GET /api/v1/user/aggregated-agencies (GET AGGREGATED AGENCIES ROUTE)", () => {});
});
