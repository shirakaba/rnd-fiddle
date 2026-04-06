import { connectionProps } from "dubloon";
import { useRef } from "react";
import { WebView } from "react-native-webview";

/**
 * Injected by babel.config.js based on the value of the VITE_PORT env var
 * passed to the shell that runs `expo start`.
 * @default 5173
 */
declare const __VITE_PORT: number;

export default function App() {
  const ref = useRef<WebView>(null);

  return (
    <WebView
      ref={ref}
      {...connectionProps({ port: __VITE_PORT })}
      webviewDebuggingEnabled
      onMessage={({ nativeEvent: { data } }) => {
        console.log(`[IPC] Got message from web: ${data}`);

        const webView = ref.current;
        if (!webView) {
          return;
        }

        let message: unknown;
        try {
          message = JSON.parse(data);
        } catch (error) {
          console.error("[IPC] Failed to parse the incoming message.", error);
          return;
        }

        console.log("[IPC] parsed the incoming message.", message);

        if (
          typeof message !== "object" ||
          !message ||
          !("namespace" in message) ||
          message.namespace !== "dubloon" ||
          !("type" in message) ||
          message.type !== "invoke-request" ||
          !("channel" in message) ||
          typeof message.channel !== "string" ||
          !("transactionId" in message) ||
          typeof message.transactionId !== "number"
        ) {
          return;
        }

        const { transactionId, channel } = message;
        const detail = "detail" in message ? message.detail : undefined;

        let response:
          | {
              namespace: "dubloon";
              type: "invoke-response";
              transactionId: number;
              channel: string;
              detail: unknown;
            }
          | undefined;
        if (channel === "ping") {
          // Expecting to get an invoke-request with a transactionId:
          // {
          //   "namespace": "dubloon",
          //   "type": "invoke-request",
          //   "transactionId": 1,
          //   "channel": "ping",
          //   "detail": 1775434032913,
          // }

          if (typeof detail !== "number") {
            return;
          }
          response = {
            namespace: "dubloon",
            type: "invoke-response",
            transactionId,
            channel,
            detail: Date.now() - detail,
          };
        }

        if (!response) {
          return;
        }

        console.log("[IPC] sending back invoke-response...", response);

        // I tried passing the response without stringification (like VS Code
        // does with its messages) and sadly the message didn't make it to the
        // other side. So it's a limitation of react-native-webview.
        webView.postMessage(JSON.stringify(response));

        // Suppress error from react-native-webview
        true;
      }}
    />
  );
}
