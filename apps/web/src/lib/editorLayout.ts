export type FileId = "App.js" | "index.js" | "metro.config.js" | "package.json";

export interface EditorFile {
  id: FileId;
  label: string;
  language: "javascript" | "json";
  readOnly?: boolean;
  value: string;
}

export interface SplitNode {
  direction: "row" | "column";
  first: LayoutNode;
  second: LayoutNode;
}

export type LayoutNode = FileId | SplitNode;

export const editorOrder: FileId[] = ["App.js", "index.js", "metro.config.js", "package.json"];

export function compareEditors(a: FileId, b: FileId) {
  return editorOrder.indexOf(a) - editorOrder.indexOf(b);
}

export function createLayout(
  fileIds: FileId[],
  direction: "row" | "column" = "row",
): LayoutNode | null {
  if (fileIds.length === 0) {
    return null;
  }

  if (fileIds.length === 1) {
    return fileIds[0];
  }

  const secondHalf = [...fileIds];
  const firstHalf = secondHalf.splice(0, Math.floor(secondHalf.length / 2));

  return {
    direction,
    first: createLayout(firstHalf, "column")!,
    second: createLayout(secondHalf, "column")!,
  };
}

export function buildInitialFiles(): EditorFile[] {
  return [
    {
      id: "App.js",
      label: "App.js",
      language: "javascript",
      value: `/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from "react-native/Libraries/NewAppScreen";

function Section({ children, title }) {
  const isDarkMode = useColorScheme() === "dark";
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

function App() {
  const isDarkMode = useColorScheme() === "dark";

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  /*
   * To keep the template simple and small we're adding padding to prevent view
   * from rendering under the System UI.
   * For bigger apps the recommendation is to use \`react-native-safe-area-context\`:
   * https://github.com/AppAndFlow/react-native-safe-area-context
   *
   * You can read more about it here:
   * https://github.com/react-native-community/discussions-and-proposals/discussions/827
   */
  const safePadding = "5%";

  return (
    <View style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView style={backgroundStyle}>
        <View style={{ paddingRight: safePadding }}>
          <Header />
        </View>
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
            paddingHorizontal: safePadding,
            paddingBottom: safePadding,
          }}
        >
          <Section title="Step One">
            Edit <Text style={styles.highlight}>App.tsx</Text> to change this
            screen and then come back to see your edits.
          </Section>
          <Section title="See Your Changes">
            <ReloadInstructions />
          </Section>
          <Section title="Debug">
            <DebugInstructions />
          </Section>
          <Section title="Learn More">
            Read the docs to discover what to do next:
          </Section>
          <LearnMoreLinks />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "600",
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "400",
  },
  highlight: {
    fontWeight: "700",
  },
});

export default App;
`,
    },
    {
      id: "index.js",
      label: "index.js",
      language: "javascript",
      value: `/**
 * @format
 */

import { AppRegistry } from "react-native";
import App from "./App";

AppRegistry.registerComponent("rnmprebuilds", () => App);
`,
    },
    {
      id: "metro.config.js",
      label: "metro.config.js",
      language: "javascript",
      value: `const path = require("node:path");
const fs = require("node:fs");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const {
  getDefaultConfig: getDefaultRnxKitConfig,
} = require("@rnx-kit/metro-config/src/defaultConfig");
const { requireModuleFromMetro } = require("@rnx-kit/tools-react-native/metro");

const symlinkedNodeModules = path.resolve(__dirname, "node_modules");
const realNodeModules = fs.realpathSync(symlinkedNodeModules);

const projectRoot = __dirname;
const [
  {
    serializer: { getModulesRunBeforeMainModule },
  },
] = getDefaultRnxKitConfig(projectRoot);

// By default, available platforms are auto-detected based on the presence of a
// react-native.config.js file in any of the top-level dependencies. If it
// references, e.g.
// \`config.platforms.macos: { npmPackageName: 'react-native-macos' }\`
// ... then the key-pair \`{ "macos": "react-native-macos" }\` gets added to
// the \`platformMap: PlatformImplementations\`.
//
// https://github.com/microsoft/rnx-kit/blob/f2a34d0b139d98d6e1a15e814f49a0d8f78b2285/packages/metro-config/src/defaultConfig.js#L176
// https://github.com/microsoft/rnx-kit/blob/f2a34d0b139d98d6e1a15e814f49a0d8f78b2285/packages/tools-react-native/src/platform.ts#L108
// https://github.com/microsoft/rnx-kit/blob/f2a34d0b139d98d6e1a15e814f49a0d8f78b2285/packages/tools-react-native/src/platform.ts#L80
// https://github.com/microsoft/react-native-macos/blob/2ee06fbca05623a71de29315afa6c596304f4291/packages/react-native/react-native.config.js#L142
//
// But we could just specify it up-front! This avoids having to add
// \`react-native-macos\` to our derived template's dependencies, reducing how
// much we fork from Electron Fiddle.
const availablePlatforms = {
  android: "",
  ios: "",
  macos: "react-native-macos",
};

const preludeModules = getPreludeModules(availablePlatforms, projectRoot);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
let config = {
  // While the original react-native-fiddle-repro template brings its own
  // node_modules, derived Fiddles do not, and so we symlink back to the
  // template's node_modules. Thus, below we adjust the Metro config to support
  // a sibling symlinked node_modules directory.
  //
  // It would be nice if it were that simple. Unfortunately, asset resolution is
  // a special case. Because it's based on URLs rather than paths, if your path
  // has any spaces in it (e.g. "./path/to/Application Support"), it fails the
  // pathBelongsToRoots() check in metro@0.82.5 (used by react-native@0.79.6 and
  // react-native-macos@0.79.0). I'm changing the template to use metro@0.83.3
  // which happens to fix this issue, though it's not the only issue with
  // assets, as you'll see with our rewriteRequestUrl() bit below.
  //
  // https://github.com/facebook/metro/issues/1609#issuecomment-3521286611

  resolver: {
    // This didn't help at all!
    // unstable_enableSymlinks: true,

    nodeModulesPaths: [realNodeModules],

    platforms: Object.keys(availablePlatforms),

    // This is the main thing we generated the default config for. We need
    // outOfTreePlatformResolver, but we want to pass in our own platformMap.
    // https://github.com/microsoft/rnx-kit/blob/f2a34d0b139d98d6e1a15e814f49a0d8f78b2285/packages/metro-config/src/defaultConfig.js#L177C43-L177C68
    // https://github.com/microsoft/rnx-kit/blob/f2a34d0b139d98d6e1a15e814f49a0d8f78b2285/packages/metro-config/src/defaultConfig.js#L99
    resolveRequest: outOfTreePlatformResolver(availablePlatforms, projectRoot),
  },
  serializer: {
    getModulesRunBeforeMainModule: () => preludeModules,
  },
  watchFolders: [realNodeModules],
  server: {
    // Rewrite all asset requests to resolve from the symlinked node_modules.
    // This is a workaround because asset lookup inside symlinked node_modules
    // fails when it involves a ../.. climb, which seems to cause us to lose the
    // magic "/assets" part.
    rewriteRequestUrl: (url) => {
      if (url.startsWith("/assets/..")) {
        const realSegment = encodeURI(
          path
            .relative(symlinkedNodeModules, realNodeModules)
            .replace(/^\\.\\./, "/assets")
        );
        const correctedPath = url.replace(realSegment, "/assets/node_modules");

        return correctedPath;
      }

      return url;
    },
  },
};

config = mergeConfig(getDefaultConfig(__dirname), config);

// I'm overwriting these paths for consistency, though haven't checked how
// necessary each of them are.
config.resolver.emptyModulePath = config.resolver.emptyModulePath.replace(
  symlinkedNodeModules,
  realNodeModules
);
config.transformer.asyncRequireModulePath =
  config.transformer.asyncRequireModulePath.replace(
    symlinkedNodeModules,
    realNodeModules
  );
config.transformer.babelTransformerPath =
  config.transformer.babelTransformerPath.replace(
    symlinkedNodeModules,
    realNodeModules
  );

module.exports = config;

/**
 * @typedef {import("metro-resolver").CustomResolver} CustomResolver;
 * @typedef {import("metro-resolver").Resolution} Resolution;
 * @typedef {import("metro-resolver").ResolutionContext} ResolutionContext;
 *
 * @typedef {ReturnType<typeof import("@rnx-kit/tools-react-native").getAvailablePlatforms>} PlatformImplementations;
 */

/**
 * Copied out of @rnx-kit/metro-config/src/defaultConfig.js as it's not
 * exported.
 *
 * @param {PlatformImplementations} availablePlatforms
 * @param {string} projectRoot
 */
function getPreludeModules(availablePlatforms, projectRoot) {
  // Include all instances of \`InitializeCore\` here and let Metro exclude
  // the unused ones.
  const requireOptions = { paths: [projectRoot] };
  const mainModules = new Set([
    require.resolve(
      "react-native/Libraries/Core/InitializeCore",
      requireOptions
    ),
  ]);
  for (const moduleName of Object.values(availablePlatforms)) {
    if (moduleName) {
      mainModules.add(
        require.resolve(
          \`\${moduleName}/Libraries/Core/InitializeCore\`,
          requireOptions
        )
      );
    }
  }
  return Array.from(mainModules);
}

/**
 * Copied out of @rnx-kit/metro-config/src/defaultConfig.js as it's not
 * exported.
 *
 * @param {PlatformImplementations} implementations
 * @param {string} projectRoot
 *
 * @see https://github.com/microsoft/rnx-kit/blob/f2a34d0b139d98d6e1a15e814f49a0d8f78b2285/packages/metro-config/src/defaultConfig.js#L177C43-L177C68
 * @see https://github.com/microsoft/rnx-kit/blob/f2a34d0b139d98d6e1a15e814f49a0d8f78b2285/packages/metro-config/src/defaultConfig.js#L99
 */
function outOfTreePlatformResolver(implementations, projectRoot) {
  const { resolve: metroResolver } = requireModuleFromMetro(
    "metro-resolver",
    projectRoot
  );

  /** @type {(context: ResolutionContext, moduleName: string, platform: string) => Resolution} */
  const platformResolver = (context, moduleName, platform) => {
    if (platform === "web") {
      // @ts-expect-error We intentionally modify \`preferNativePlatform\` to support web
      context.preferNativePlatform = false;
    }

    /** @type {CustomResolver} */
    let resolve = metroResolver;
    const resolveRequest = context.resolveRequest;
    if (platformResolver === resolveRequest) {
      // @ts-expect-error We intentionally delete \`resolveRequest\` here and restore it later
      delete context.resolveRequest;
    } else if (resolveRequest) {
      resolve = resolveRequest;
    }

    try {
      const impl = implementations[platform];
      const modifiedModuleName = redirectToPlatform(moduleName, impl);
      // @ts-expect-error We pass 4 arguments instead of 3 to be backwards compatible
      return resolve(context, modifiedModuleName, platform, null);
    } finally {
      if (!context.resolveRequest) {
        // @ts-expect-error We intentionally deleted \`resolveRequest\` and restore it here
        context.resolveRequest = resolveRequest;
      }
    }
  };
  return platformResolver;
}

/**
 * Copied out of @rnx-kit/metro-config/src/defaultConfig.js as it's not
 * exported.
 *
 * @param {string} moduleName
 * @param {string} implementation
 */
function redirectToPlatform(moduleName, implementation) {
  if (implementation) {
    if (moduleName === "react-native") {
      return implementation;
    }

    const prefix = "react-native/";
    if (moduleName.startsWith(prefix)) {
      return \`\${implementation}/\${moduleName.slice(prefix.length)}\`;
    }
  }
  return moduleName;
}
`,
    },
    {
      id: "package.json",
      label: "package.json",
      language: "json",
      readOnly: true,
      value: `{
  "name": "minimal-repro",
  "version": "1.0.0",
  "description": "A minimal React Native application",
  "scripts": {
    "start": "rnx-cli start"
  },
  "dependencies": {
    "react": "19.0.0",
    "react-native": "0.79.6",
    "react-native-macos": "0.79.1"
  },
  "devDependencies": {
    "@babel/core": "7.28.5",
    "@babel/preset-env": "7.28.5",
    "@babel/runtime": "7.28.4",
    "@react-native-community/cli": "18.0.0",
    "@react-native-community/cli-platform-android": "18.0.0",
    "@react-native-community/cli-platform-ios": "18.0.0",
    "@react-native/babel-preset": "0.79.7",
    "@react-native/eslint-config": "0.79.7",
    "@react-native/metro-config": "0.83.0-rc.1",
    "@react-native/typescript-config": "0.79.7",
    "@rnx-kit/cli": "1.0.0",
    "@rnx-kit/metro-config": "2.2.0",
    "@types/react": "19.2.2",
    "expo-modules-autolinking": "3.0.19",
    "metro": "0.83.3",
    "typescript": "5.0.4"
  },
  "overrides": {
    "metro": "0.83.3",
    "metro-config": "0.83.3",
    "@react-native/community-cli-plugin": "0.83.0-rc.1",
    "@react-native/metro-config": "0.83.0-rc.1"
  }
}
`,
    },
  ];
}
