/// <reference lib="dom" />
/// <reference path="../dom-events-wintercg.d.ts" />

import { CustomEvent, EventTarget } from "dom-events-wintercg";
import { WebView, WebViewMessageEvent } from "react-native-webview";

import { isInvokeRequest, isSendMessage, isWebViewMessage, type InvokeResponse } from "../common";

// type Listener = Parameters<IpcMain["handle"]>[1];

// WIP - currently non-functional
class IpcMain extends EventTarget implements Dubloon.IpcMain {
  // private readonly handles: Record<string, Listener> = {};
  private readonly handlers: {
    [channel: string]: (event: Dubloon.IpcMainInvokeEvent) => Promise<any> | any;
  } = {};

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

      // let response:
      //   | {
      //       namespace: "dubloon";
      //       type: "send";
      //       channel: string;
      //       detail: unknown;
      //     }
      //   | undefined;

      this.dispatchEvent(new CustomEvent(message.channel, { detail }));
      return;
    }

    if (isInvokeRequest(message)) {
      // We need to respond to the renderer with "invoke-response".
      const { transactionId, channel } = message;

      const handler = this.handlers[channel];

      (async () => {
        let result: unknown;
        try {
          result = handler(new IpcMainInvokeEvent("invoke-response", { detail }));
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
      return;
    }
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

class IpcMainEvent<T = any> extends CustomEvent<T> {
  type!: "frame";
}
Object.defineProperty(IpcMainEvent.prototype, "type", { value: "frame" });

class IpcMainInvokeEvent<T = any> extends CustomEvent<T> {
  type!: "frame";
}
Object.defineProperty(IpcMainInvokeEvent.prototype, "type", { value: "frame" });
