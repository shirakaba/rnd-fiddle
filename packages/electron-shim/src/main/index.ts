import type { WebView, WebViewMessageEvent } from "react-native-webview";

import EventEmitter from "eventemitter3";

import { isInvokeRequest, isSendMessage, isWebViewMessage, type InvokeResponse } from "../common";
import { IpcMainEventImpl, IpcMainInvokeEventImpl } from "../common/ipc-event";

class IpcMain extends EventEmitter implements Dubloon.IpcMain {
  private readonly handlers: {
    [channel: string]: {
      callback: (event: Dubloon.IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any;
      once: boolean;
    };
  } = {};

  getMaxListeners(): number {
    throw new Error("Not implemented");
  }
  setMaxListeners(max: number): this {
    throw new Error("Not implemented");
  }
  rawListeners<K>(eventName: string | symbol): Function[] {
    throw new Error("Not implemented");
  }
  prependListener<K>(eventName: string | symbol, listener: (...args: any[]) => void): this {
    throw new Error("Not implemented");
  }
  prependOnceListener<K>(eventName: string | symbol, listener: (...args: any[]) => void): this {
    throw new Error("Not implemented");
  }

  verbose = false;

  handle(
    channel: string,
    listener: (event: Dubloon.IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any,
  ) {
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

    const args = "args" in message && Array.isArray(message.args) ? message.args : [];

    if (isSendMessage(message)) {
      this.emit(message.channel, new IpcMainEventImpl(webView), ...args);
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
          result = handler.callback(new IpcMainInvokeEventImpl(), ...args);
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

  removeHandler(channel: string): void {
    delete this.handlers[channel];
  }
}

export const ipcMain = new IpcMain();
