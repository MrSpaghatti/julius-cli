/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  testMatch: ['**/test/**/*.test.{ts,tsx}'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/cli.ts',
    '!src/api/types.ts',
  ],
};
