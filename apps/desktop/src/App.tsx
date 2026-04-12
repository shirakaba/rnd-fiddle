/// <reference types="dubloon-electron-shim/main" />
import { connectionProps } from "dubloon";
import { ipcMain } from "dubloon-electron-shim/main";
import { spawn } from "expo-child-process";
import { useEffect, useRef } from "react";
import { WebView } from "react-native-webview";

/**
 * Injected by babel.config.js based on the value of the VITE_PORT env var
 * passed to the shell that runs `expo start`.
 * @default 5173
 */
declare const __VITE_PORT: number;

export default function App() {
  const ref = useRef<WebView>(null);

  useEffect(() => {
    const child = spawn("echo", ["$PATH"], { shell: "/bin/zsh" });
    child.on("error", (error) => {
      console.error("[error]", error);
    });
    child.stdout?.on("data", (buffer) => {
      console.log("[data]", buffer.toString());
    });
    child.on("close", (code, signal) => {
      console.log(`[close] ${code}, ${signal}`);
    });
  }, []);

  return (
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
  );
}
