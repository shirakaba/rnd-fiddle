/// <reference lib="dom" />
/// <reference path="../dom-events-wintercg.d.ts" />

import { EventTarget } from "dom-events-wintercg";
import { WebView, WebViewMessageEvent } from "react-native-webview";

// type Listener = Parameters<IpcMain["handle"]>[1];

// WIP - currently non-functional
class IpcMain extends EventTarget implements Dubloon.IpcMain {
  // private readonly handles: Record<string, Listener> = {};

  onWebViewMessage(webView: WebView | null, { nativeEvent: { data } }: WebViewMessageEvent) {
    console.log(`[IPC] Got message from web: ${data}`);

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

    // this.dispatchEvent("");
  }

  addEventListener(
    channel: string,
    listener: ((event: Dubloon.IpcMainEvent) => void) | EventListenerOrEventListenerObject | null,
  ): void {
    // TODO
  }

  handle(channel: string, listener: (event: Dubloon.IpcMainInvokeEvent) => Promise<any> | any) {
    // this.handles[channel] = listener;
    // this.addEventListener(channel, (event) => {
    //   if (!(event instanceof CustomEvent)) {
    //     return;
    //   }
    //   listener(event as Dubloon.IpcMainInvokeEvent);
    // });
  }

  handleOnce(
    channel: string,
    listener: (event: Dubloon.IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any,
  ): void {}
}

export const ipcMain = new IpcMain();
