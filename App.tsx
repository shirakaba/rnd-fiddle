import { connectionProps } from "dubloon";
import { WebView } from "react-native-webview";

export default function App() {
  return <WebView {...connectionProps({ port: 5173 })} webviewDebuggingEnabled />;
}
