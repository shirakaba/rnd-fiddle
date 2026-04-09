/// <reference types="dubloon-electron-shim/main" />
import { connectionProps } from "dubloon";
import { ipcMain } from "dubloon-electron-shim/main";
import { spawn } from "expo-child-process";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

import { useIpcMain } from "./use-ipc-main";

/**
 * Injected by babel.config.js based on the value of the VITE_PORT env var
 * passed to the shell that runs `expo start`.
 * @default 5173
 */
declare const __VITE_PORT: number;

export default function App() {
  const ref = useRef<WebView>(null);
  const [smokeMessage, setSmokeMessage] = useState("Checking Expo Module...");

  useIpcMain();

  useEffect(() => {
    const cp = spawn("node --version");
    const { stdout, stderr } = cp;
    console.log("got stdout", stdout);
    stdout?.on("data", (buffer) => {
      console.log("[buffer]", buffer);
      console.log("[bufferstr]", buffer.toString());
    });
    cp.on("close", (...args) => {
      console.log(`[close]`, args);
    });
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        ref={ref}
        {...connectionProps({ port: __VITE_PORT })}
        webviewDebuggingEnabled
        onMessage={(event) => {
          ipcMain.onWebViewMessage(ref.current, event);

          // Suppress error from react-native-webview
          true;
        }}
      />
      <View pointerEvents="none" style={styles.smokeBadge}>
        <Text style={styles.smokeText}>{smokeMessage}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  smokeBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    maxWidth: 320,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(18, 24, 38, 0.82)",
  },
  smokeText: {
    color: "#f7f7f8",
    fontSize: 12,
  },
});
