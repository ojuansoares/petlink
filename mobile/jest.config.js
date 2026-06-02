/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.{ts,tsx}'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  clearMocks: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['./jest.setup.ts'],
  transformIgnorePatterns: [
    '/node_modules/(?!' +
      '(.pnpm|' +
      'react-native|@react-native|@react-native-community|' +
      'expo|@expo|@expo-google-fonts|' +
      'react-navigation|@react-navigation|' +
      '@sentry/react-native|native-base|' +
      'immer|@reduxjs/toolkit|react-redux|redux-persist|' +
      'react-native-reanimated|react-native-gesture-handler|' +
      'react-native-screens|react-native-safe-area-context|' +
      '@react-native-async-storage/async-storage|' +
      'react-native-webview|react-native-keychain|' +
      'date-fns' +
      ')' +
    ')',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
}
