import EventEmitter from "eventemitter3";

import { isInvokeResponse, isSendMessage, isWebViewMessage, type SendMessage } from "../common";
import { IpcRendererEventImpl } from "../common/ipc-event";

class IpcRenderer extends EventEmitter implements Dubloon.IpcRenderer {
  private readonly pendingInvokes: {
    [transactionId: number]: {
      reject(error: Error): void;
      resolve(value: unknown): void;
    };
  } = {};
  private invokeCount = 0;

  verbose = false;

  constructor() {
    super();
    window.addEventListener("message", this.onWindowMessage, true);
  }

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

  invoke(channel: string, ...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.verbose && console.log(`invoke("${channel}", ...args) 1`);
      if (!isReactNativeWebViewWindow(window)) {
        this.verbose && console.log(`invoke("${channel}", ...args) 2a`);
        return reject(
          new Error("Expected window.ReactNativeWebView to be populated, but got undefined."),
        );
      }
      this.verbose && console.log(`invoke("${channel}", ...args) 2b`);

      const transactionId = ++this.invokeCount;
      this.pendingInvokes[transactionId] = { resolve, reject };
      this.verbose && console.log(`invoke("${channel}", ...args) 5`);

      let message: string;
      try {
        message = JSON.stringify({
          namespace: "dubloon",
          type: "invoke-request",
          transactionId,
          channel,
          args,
        });
        this.verbose && console.log(`invoke("${channel}", ...args) 6a`);
      } catch (cause) {
        this.verbose && console.log(`invoke("${channel}", ...args) 6b`);
        delete this.pendingInvokes[transactionId];
        return reject(
          new Error(
            "Unable to stringify IPC message. Make sure the IPC arguments are serialisable values.",
            { cause },
          ),
        );
      }

      window.ReactNativeWebView.postMessage(message);
    });
  }

  private readonly onWindowMessage = ({ data }: MessageEvent<any>): any => {
    if (typeof data !== "string") {
      return;
    }

    let message: unknown;
    try {
      message = JSON.parse(data);
    } catch (error) {
      return;
    }

    // We're expecting the WebView to send us a resolution or a rejection:
    // {
    //   namespace: "dubloon",
    //   type: "invoke-response",
    //   subtype: "resolve",
    //   transactionId: 123,
    //   channel: "ping",
    //   value: 456,
    // }
    //
    // {
    //   namespace: "dubloon",
    //   type: "invoke-response",
    //   subtype: "reject",
    //   transactionId: 123,
    //   channel: "ping",
    //   error: { message: string; stack?: string },
    // }

    if (!isWebViewMessage(message)) {
      return;
    }
    if (isInvokeResponse(message)) {
      const pendingInvoke = this.pendingInvokes[message.transactionId];

      this.verbose &&
        console.log(`[onWindowMessage] invoke "${message.channel}":${message.transactionId}`, {
          message,
          pendingInvoke,
        });

      if (!pendingInvoke) {
        return;
      }

      delete this.pendingInvokes[message.transactionId];

      if (message.subtype === "resolve") {
        pendingInvoke.resolve(message.value);
      } else {
        const { message: errorMessage, stack } = message.error ?? { message: "<unserialisable>" };
        const error = new Error(errorMessage);
        if (stack) {
          error.stack = stack;
        }
        pendingInvoke.reject(error);
      }
      return;
    }

    if (!isSendMessage(message)) {
      return;
    }

    const args = Array.isArray(message.args) ? message.args : [];
    this.emit(message.channel, new IpcRendererEventImpl(this), ...args);
  };

  send(channel: string, ...args: any[]): void {
    if (!isReactNativeWebViewWindow(window)) {
      this.verbose && console.log(`send("${channel}", ...args) 1a`);
      throw new Error("Expected window.ReactNativeWebView to be populated, but got undefined.");
    }

    this.verbose && console.log(`send("${channel}", ...args) 1b`);

    let message: string;
    try {
      message = JSON.stringify({
        namespace: "dubloon",
        type: "send",
        channel,
        args,
      } satisfies SendMessage);
      this.verbose && console.log(`send("${channel}", ...args) 2a`);
    } catch (cause) {
      this.verbose && console.log(`send("${channel}", ...args) 2b`);
      throw new Error(
        "Unable to stringify IPC message. Make sure the IPC arguments are serialisable values.",
        { cause },
      );
    }

    window.ReactNativeWebView.postMessage(message);
  }
}

function isReactNativeWebViewWindow(window: Window): window is ReactNativeWebViewWindow {
  return "ReactNativeWebView" in window;
}

interface ReactNativeWebViewWindow extends Window {
  ReactNativeWebView: {
    postMessage(message: string): void;
    postMessage(data: any): void;
  };
}

export const ipcRenderer = new IpcRenderer();
