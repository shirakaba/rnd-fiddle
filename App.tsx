import { connectionProps } from "dubloon";
import { WebView } from "react-native-webview";

/**
 * Injected by babel.config.js based on the value of the VITE_PORT env var
 * passed to the shell that runs `expo start`.
 * @default 5173
 */
declare const __VITE_PORT: number;

export default function App() {
  return <WebView {...connectionProps({ port: __VITE_PORT })} webviewDebuggingEnabled />;
}
