module.exports = {
  resetMocks: true,
  roots: ["<rootDir>/src"],
  setupFiles: ["whatwg-fetch"],
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.js"],
  snapshotFormat: {
    escapeString: true
  },
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"],
    url: "http://localhost"
  },
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
    "^(?!.*\\.(js|jsx|mjs|cjs|json|css|sass|scss)$)":
      "<rootDir>/test/fileTransform.cjs"
  },
  moduleNameMapper: {
    "^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",
    "^.+\\.(css|sass|scss)$": "<rootDir>/test/styleMock.js"
  }
};
