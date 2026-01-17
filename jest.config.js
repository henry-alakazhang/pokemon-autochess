const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "jsdom",
  // fakeTimers: { enableGlobally: true },
  testTimeout: 10000,
  transform: {
    ...tsJestTransformCfg,
  },
  setupFilesAfterEnv: [
    './jest.setup.js',
  ],
};