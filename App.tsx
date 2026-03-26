import { connectionProps } from "dubloon";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

export default function App() {
  // Where "8080" is the port for your web app's dev server.
  return <WebView {...connectionProps({ port: 8080 })} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
