module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native)"
  ],
  moduleNameMapper: {
    "^react$": "<rootDir>/../../node_modules/react",
    "^react/(.*)$": "<rootDir>/../../node_modules/react/$1",
    "^react-native$": "<rootDir>/../../node_modules/react-native",
    "^react-test-renderer$": "<rootDir>/node_modules/react-test-renderer"
  },
  moduleDirectories: ['node_modules', '../../node_modules']
};
