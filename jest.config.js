/** Jest: pure TS unit tests use ts-jest (node) to avoid jest-expo / RN 0.76 NativeModules
 *  incompatibilities. React Native + RTL tests use jest-expo (see `*.test.tsx` project).
 * @type {import('jest').Config}
 */
module.exports = {
  projects: [
    {
      displayName: "unit-ts",
      testMatch: ["<rootDir>/src/**/*.test.ts"],
      testEnvironment: "node",
      setupFiles: ["<rootDir>/jest.setup.node.js"],
      testPathIgnorePatterns: ["/node_modules/"],
      transform: {
        "^.+\\.ts$": ["ts-jest", { tsconfig: { module: "commonjs", esModuleInterop: true } }],
      },
      moduleNameMapper: {
        "^@/app/(.*)$": "<rootDir>/app/$1",
        "^@/features/(.*)$": "<rootDir>/src/features/$1",
        "^@/shared/(.*)$": "<rootDir>/src/shared/$1",
        "^@/modules/(.*)$": "<rootDir>/modules/$1",
      },
    },
    {
      displayName: "app",
      preset: "jest-expo",
      testMatch: ["<rootDir>/**/*.test.tsx", "<rootDir>/**/*.test.jsx"],
      testPathIgnorePatterns: ["/node_modules/", "maestro/"],
      setupFiles: ["<rootDir>/jest.setup.js"],
      setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
      moduleNameMapper: {
        "^@/app/(.*)$": "<rootDir>/app/$1",
        "^@/features/(.*)$": "<rootDir>/src/features/$1",
        "^@/shared/(.*)$": "<rootDir>/src/shared/$1",
        "^@/modules/(.*)$": "<rootDir>/modules/$1",
      },
      transformIgnorePatterns: [
        "node_modules/(?!(jest-)?react-native|@react-native|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|nativewind|react-native-css-interop)",
      ],
      collectCoverageFrom: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}", "!**/*.d.ts"],
    },
  ],
};
