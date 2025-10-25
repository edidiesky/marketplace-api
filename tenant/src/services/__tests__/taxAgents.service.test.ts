import { afterAll, describe, expect, jest, test } from "@jest/globals";
import TaxAgents from "../../models/TaxAgents";

jest.mock("../../models/TaxAgents");

describe("Tax Agents Service", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  describe("Get All Tax Agents Service", () => {});
  describe("Register A Tax Agents Service", () => {});
  describe("Sign In A Tax Agents Service", () => {});
  describe("Get A Single Tax Agents Service", () => {});
  describe("Update A Single Tax Agents Service", () => {});
  describe("Delete A Single Tax Agents Service", () => {});
});
