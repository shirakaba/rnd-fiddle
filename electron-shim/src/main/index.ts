/// <reference lib="dom" />
/// <reference path="../event-target-shim.d.ts" />

import type { WebView, WebViewMessageEvent } from "react-native-webview";

import { EventTarget } from "event-target-shim";

import { isInvokeRequest, isSendMessage, isWebViewMessage, type InvokeResponse } from "../common";
import { CustomEventImpl as CustomEvent } from "./custom-event";

class IpcMain extends EventTarget implements Dubloon.IpcMain {
  private readonly handlers: {
    [channel: string]: {
      callback: (event: Dubloon.IpcMainInvokeEvent) => Promise<any> | any;
      once: boolean;
    };
  } = {};

  verbose = false;

  addEventListener(
    channel: string,
    listener: ((event: Dubloon.IpcMainEvent) => void) | EventListenerOrEventListenerObject | null,
  ): void {
    super.addEventListener(channel, listener as EventListenerOrEventListenerObject);
  }

  handle(channel: string, listener: (event: Dubloon.IpcMainInvokeEvent) => Promise<any> | any) {
    this.handlers[channel] = { callback: listener, once: false };
  }

  handleOnce(
    channel: string,
    listener: (event: Dubloon.IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any,
  ): void {
    this.handlers[channel] = { callback: listener, once: true };
  }

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

    if (!isWebViewMessage(message)) {
      return;
    }

    const detail = "detail" in message ? message.detail : undefined;

    if (isSendMessage(message)) {
      // The renderer is not awaiting any response.
      this.dispatchEvent(new CustomEvent(message.channel, { detail }));
      return;
    }

    if (isInvokeRequest(message)) {
      // We need to respond to the renderer with "invoke-response".
      const { transactionId, channel } = message;

      const handler = this.handlers[channel];
      this.verbose && console.log(`!! Calling this.handlers["${channel}"]`, { handler, message });

      if (!handler) {
        const error = new Error(`No handler registered. Please call ipcMain.handle("${channel}")`);
        webView.postMessage(
          JSON.stringify({
            namespace: "dubloon",
            type: "invoke-response",
            subtype: "reject",
            transactionId,
            channel,
            error: { message: error.message, stack: error.stack },
          } satisfies InvokeResponse & { subtype: "reject" }),
        );
        return;
      }

      if (handler.once) {
        delete this.handlers[channel];
      }

      (async () => {
        let result: unknown;
        try {
          result = handler.callback(new IpcMainInvokeEvent("invoke-response", { detail }));
          if (result instanceof Promise) {
            result = await result;
          }
        } catch (error) {
          const serialisedError =
            error instanceof Error ? { message: error.message, stack: error.stack } : undefined;

          webView.postMessage(
            JSON.stringify({
              namespace: "dubloon",
              type: "invoke-response",
              subtype: "reject",
              transactionId,
              channel,
              error: serialisedError,
            } satisfies InvokeResponse & { subtype: "reject" }),
          );
          return;
        }

        webView.postMessage(
          JSON.stringify({
            namespace: "dubloon",
            type: "invoke-response",
            subtype: "resolve",
            transactionId,
            channel,
            value: result,
          } satisfies InvokeResponse & { subtype: "resolve" }),
        );
      })();

      return;
    }
  }
}

export const ipcMain = new IpcMain();

class IpcMainEvent<T = any> extends CustomEvent<T> {
  type!: "frame";
}
Object.defineProperty(IpcMainEvent.prototype, "type", { value: "frame" });

class IpcMainInvokeEvent<T = any> extends CustomEvent<T> {
  type!: "frame";
}
Object.defineProperty(IpcMainInvokeEvent.prototype, "type", { value: "frame" });
