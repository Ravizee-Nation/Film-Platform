// Jest config: the jest-expo preset, plus .mjs files (Better Auth ships ES modules only).
const preset = require('jest-expo/jest-preset');

const transform = {};
for (const [pattern, transformer] of Object.entries(preset.transform)) {
  transform[pattern === '\\.[jt]sx?$' ? '\\.m?[jt]sx?$' : pattern] = transformer;
}

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  transform,
  testMatch: ['<rootDir>/src/**/*.test.ts?(x)'],
  transformIgnorePatterns: [
    'node_modules/(?!(?:\\.pnpm|(?:jest-)?react-native|@react-native(?:-community)?|expo(?:nent)?|@expo(?:nent)?/.*|expo-.*|react-native-.*|@shopify/flash-list|@film/.*|better-auth|@better-auth/.*|@better-fetch/.*|better-call|nanostores|@nanostores/.*|jose|defu|rou3|uncrypto))',
  ],
};
