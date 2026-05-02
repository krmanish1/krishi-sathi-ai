const fs = require("fs");
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/**
 * EAS / Gradle often run with `process.cwd()` = `android/`. Metro and NativeWind
 * must still use the real Expo root (where package.json + app.config live).
 */
function findExpoProjectRoot() {
  const tryStart = (start) => {
    let dir = path.resolve(start);
    for (let i = 0; i < 12; i++) {
      const pkgPath = path.join(dir, "package.json");
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
          if (pkg.dependencies?.expo || pkg.devDependencies?.expo) {
            return dir;
          }
        } catch {
          /* keep walking */
        }
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return null;
  };

  return tryStart(__dirname) ?? tryStart(process.cwd()) ?? __dirname;
}

const projectRoot = findExpoProjectRoot();

const prevCwd = process.cwd();
process.chdir(projectRoot);

let config;
try {
  config = getDefaultConfig(projectRoot);
  config = withNativeWind(config, {
    input: path.join(projectRoot, "global.css"),
    configPath: path.join(projectRoot, "tailwind.config.js"),
  });
} finally {
  process.chdir(prevCwd);
}

module.exports = config;
