/// <reference types="dubloon-electron-shim/main" />
import { connectionProps } from "dubloon";
import { ipcMain } from "dubloon-electron-shim/main";
import ExpoChildProcess from "expo-child-process";
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
    let didCancel = false;
    let child: InstanceType<typeof ExpoChildProcess.ChildProcess> | null = null;

    try {
      const scriptPath = ExpoChildProcess.getTestScriptPath();
      child = ExpoChildProcess.execFile(
        scriptPath,
        ["desktop-smoke"],
        { encoding: "utf8" },
        (error, stdout, stderr) => {
          if (didCancel) {
            return;
          }

          if (error) {
            const message = error.message || String(error);
            setSmokeMessage(`Child process failed: ${message}`);
            console.error("[expo-child-process]", error, stderr);
            return;
          }

          const output = typeof stdout === "string" ? stdout.trim() : String(stdout);
          setSmokeMessage(output || ExpoChildProcess.getMessage());
          console.log("[expo-child-process]", output || ExpoChildProcess.getMessage());
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSmokeMessage(`Expo Module failed: ${message}`);
      console.error("[expo-child-process]", error);
    }

    return () => {
      didCancel = true;
      child?.kill("SIGTERM");
    };
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
