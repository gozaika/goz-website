// Monorepo note: babel-preset-expo is hoisted to the workspace root while
// expo-router stays app-local, so the preset's `hasModule('expo-router')` gate
// returns false and the expo-router transform (require.context /
// EXPO_ROUTER_APP_ROOT inlining) is skipped. We add the plugin explicitly.
// Revisit this on any Expo SDK upgrade. See docs/runbooks/mobile-app-identity-migration.md.
const { expoRouterBabelPlugin } = require("babel-preset-expo/build/expo-router-plugin");

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [expoRouterBabelPlugin],
  };
};
