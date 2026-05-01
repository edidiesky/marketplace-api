import { jest } from "@jest/globals";

export const mockWithTransaction = (): void => {
  jest.mock("../../utils/withTransaction", () => ({
    withTransaction: jest
      .fn()
      .mockImplementation((fn: unknown) =>
        (fn as (session: null) => Promise<unknown>)(null),
      ),
  }));
};