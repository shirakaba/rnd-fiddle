/// <reference types="dubloon-electron-shim/main" />
import { connectionProps } from "dubloon";
import { ipcMain } from "dubloon-electron-shim/main";
import { useRef } from "react";
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

  useIpcMain();

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
