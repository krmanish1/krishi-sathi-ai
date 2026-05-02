const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Resolve from this file's directory so Metro works when cwd is `android/` (EAS local, Gradle).
const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

module.exports = withNativeWind(config, {
  input: path.join(projectRoot, "global.css"),
  configPath: path.join(projectRoot, "tailwind.config.js"),
});
