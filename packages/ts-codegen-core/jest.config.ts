export default {
  testEnvironment: "node",
  modulePaths: ["<rootDir>"],
  moduleNameMapper: {
    "^@ts-tool/([^/]+)$": "<rootDir>/src/index.ts",
  },
  coverageDirectory: "coverage",
  testRegex: ".*/__tests__/.+\\.(generator|test|spec)\\.(ts|tsx)$",
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/__types__/**", "!src/bootstrap.ts", "!src/index.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
};
