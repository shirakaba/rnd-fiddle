import { connectionProps } from "dubloon";
import { WebView } from "react-native-webview";

declare const __VITE_PORT: number;

export default function App() {
  console.log("vite port:", __VITE_PORT);

  return <WebView {...connectionProps({ port: 5173 })} webviewDebuggingEnabled />;
}
