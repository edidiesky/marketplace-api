import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json", useESM: true }],
  },
  testRegex: "/__tests__/integration/.*\\.integration\\.test\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  verbose: true,
  forceExit: true,
  clearMocks: false,
  resetMocks: false,
  restoreMocks: false,
  globalSetup:
    "<rootDir>/src/__tests__/integration/setup/globalSetup.ts",
  globalTeardown:
    "<rootDir>/src/__tests__/integration/setup/globalTeardown.ts",
  setupFilesAfterEnv: [
    "<rootDir>/src/__tests__/integration/setup/setupFile.ts",
  ],
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  extensionsToTreatAsEsm: [".ts"],
};

export default config;