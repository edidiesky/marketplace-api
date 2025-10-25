import { afterAll, describe, expect, jest, test } from "@jest/globals";
import TaxOffices from "../../models/TaxOffices";

jest.mock("../../models/TaxOffices");

describe("Tax Offices Service", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  describe("Get All Tax Offices Service", () => {});
  describe("Register A Tax Offices Service", () => {});
  describe("Sign In A Tax Offices Service", () => {});
  describe("Get A Single Tax Offices Service", () => {});
  describe("Update A Single Tax Offices Service", () => {});
  describe("Delete A Single Tax Offices Service", () => {});
});
