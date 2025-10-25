import { afterAll, describe, expect, jest, test } from "@jest/globals";
import User from "../../models/User";

jest.mock("../../models/User");

describe("User Service", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  describe("Get All User Service", () => {});
  describe("Register A User Service", () => {});
  describe("Sign In A User Service", () => {});
  describe("Get A Single User Service", () => {});
  describe("Update A Single User Service", () => {});
  describe("Delete A Single User Service", () => {});
});
