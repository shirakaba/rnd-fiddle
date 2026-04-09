/// <reference types="dubloon-electron-shim/main" />
import { Buffer } from "buffer";
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
    const cp = spawn("node --version");
    const { stdout, stderr } = cp;
    console.log("got stdout", stdout);
    stdout?.on("data", (buffer: Buffer) => {
      console.log("[buffer]", buffer);
      console.log("[bufferstr]", buffer.toString());
    });
    cp.on("close", (...args) => {
      console.log(`[close]`, args);
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
