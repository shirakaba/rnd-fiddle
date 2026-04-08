// This file was added when, after migrating to a monorepo structure, the RNC
// CLI stopped being able to find the "macos" directory. Possibly, its default
// expectation is for it to be in the root of the git repo or something.

const path = require("node:path");

const reactNativeMacOSRoot = path.dirname(
  require.resolve("react-native-macos/package.json", { paths: [__dirname] }),
);
const apple = require(
  require.resolve("@react-native-community/cli-platform-apple", {
    paths: [reactNativeMacOSRoot],
  }),
);

module.exports = {
  project: {
    macos: {
      sourceDir: "./macos",
    },
  },
  platforms: {
    macos: {
      npmPackageName: "react-native-macos",
      projectConfig: apple.getProjectConfig({ platformName: "macos" }),
      dependencyConfig: apple.getDependencyConfig({ platformName: "macos" }),
      // macOS linking is intentionally handled outside the generic RN linker.
      linkConfig: () => ({
        isInstalled: () => false,
        register: () => {},
        unregister: () => {},
        copyAssets: () => {},
        unlinkAssets: () => {},
      }),
    },
  },
};
