// Expo Metro config. getDefaultConfig auto-detects the monorepo workspace root.
// https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// expo-router is app-local while @expo/metro-config is hoisted, so its
// expo-router detection can miss and leave require.context disabled. Enable it
// explicitly so the file-based router works. Revisit on Expo SDK upgrades.
config.transformer = config.transformer || {};
config.transformer.unstable_allowRequireContext = true;

module.exports = config;
