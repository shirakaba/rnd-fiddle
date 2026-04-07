/// <reference lib="dom" />

import { isInvokeResponse, isInvokeResponseEvent, isWebViewMessage } from "../common";

class IpcRenderer extends EventTarget implements Dubloon.IpcRenderer {
  private readonly invokers: {
    [channel: string]: {
      [transactionId: number]: EventTarget;
    };
  } = {};
  private invokeCount = 0;
  private readonly listeners: Record<string, EventTarget> = {};

  verbose = false;

  invoke(channel: string, detail?: CustomEvent["detail"]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.verbose && console.log(`invoke("${channel}", ${detail}) 1`);
      if (!isReactNativeWebViewWindow(window)) {
        this.verbose && console.log(`invoke("${channel}", ${detail}) 2a`);
        return reject(
          new Error("Expected window.ReactNativeWebView to be populated, but got undefined."),
        );
      }
      this.verbose && console.log(`invoke("${channel}", ${detail}) 2b`);

      if (!Object.keys(this.invokers).length) {
        this.verbose && console.log(`invoke("${channel}", ${detail}) 2c`);
        window.addEventListener("message", this.lazyHandleInvokeResponse.bind(this), true);
      }

      const transactionId = ++this.invokeCount;

      let invokersForChannel: { [transactionId: number]: EventTarget };
      let invoker: EventTarget;
      if (!this.invokers[channel]) {
        this.invokers[channel] = {};
      }
      invokersForChannel = this.invokers[channel];
      if (!this.invokers[channel][transactionId]) {
        this.invokers[channel][transactionId] = new EventTarget();
      }
      invoker = this.invokers[channel][transactionId];

      let removeInvoker: () => void;
      const onEvent = (event: Event) => {
        // We're expecting this.lazyHandleInvokeResponse() to pass along the
        // message from the WebView in this shape:
        // {
        //   type: "invoke-response",
        //   detail: {
        //     transactionId: 123,
        //     subtype: "resolve",
        //     value: 456,
        //   },
        // }
        // {
        //   type: "invoke-response",
        //   detail: {
        //     transactionId: 123,
        //     subtype: "reject",
        //     error: { message: string, stack?: string },
        //   },
        // }

        if (!isInvokeResponseEvent(event)) {
          return;
        }

        const { detail } = event;

        this.verbose && console.log(`invoke("${channel}", <detail>) 4b`);

        removeInvoker();

        if (detail.subtype === "resolve") {
          resolve(detail.value);
        } else {
          const { message, stack } = detail.error ?? { message: "<unserialisable>" };
          const error = new Error(message);
          if (error.stack) {
            error.stack = stack;
          }
          reject(error);
        }
      };

      this.verbose && console.log(`Added event listener to invoker "${channel}":${transactionId}`);
      invoker.addEventListener("invoke-response", onEvent);

      removeInvoker = () => {
        this.verbose &&
          console.log(`Removed event listener for invoker "${channel}":${transactionId}`);
        invoker.removeEventListener(channel, onEvent);
        delete invokersForChannel[transactionId];
        if (!Object.keys(invokersForChannel).length) {
          this.verbose && console.log(`[REMOVE] invoke("${channel}", <detail>) 7a`);
          delete this.invokers[channel];
        } else {
          this.verbose && console.log(`[REMOVE] invoke("${channel}", <detail>) 7b`);
        }
      };

      this.verbose && console.log(`invoke("${channel}", <detail>) 5`);

      let message: string;
      try {
        message = JSON.stringify({
          namespace: "dubloon",
          type: "invoke-request",
          transactionId,
          channel,
          detail,
        });
        this.verbose && console.log(`invoke("${channel}", <detail>) 6a`);
      } catch (cause) {
        this.verbose && console.log(`invoke("${channel}", <detail>) 6b`);
        removeInvoker();
        return reject(
          new Error(
            "Unable to stringify IPC message. Make sure `detail` is a serialisable value.",
            { cause },
          ),
        );
      }

      window.ReactNativeWebView.postMessage(message);
    });
  }

  private lazyHandleInvokeResponse({ data }: MessageEvent<any>): any {
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
    if (!isInvokeResponse(message)) {
      return;
    }

    const { channel, transactionId } = message;
    const invoker = this.invokers[channel]?.[transactionId];

    this.verbose &&
      console.log(`[lazyHandleInvokeResponse] "${channel}":${transactionId}`, {
        message,
        invoker,
      });

    invoker.dispatchEvent(
      new CustomEvent(message.type, {
        detail: {
          transactionId,
          ...(message.subtype === "resolve"
            ? {
                subtype: "resolve",
                value: message.value,
              }
            : {
                subtype: "reject",
                error: message.error,
              }),
        },
      }),
    );
  }

  addEventListener(
    type: string,
    callback: ((event: CustomEvent<any>) => void) | EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined,
  ): void {
    if (!Object.keys(this.listeners)) {
      window.addEventListener("message", this.lazyOnWindowMessage, true);
    }

    if (!this.listeners[type]) {
      this.listeners[type] = new EventTarget();
    }
    this.listeners[type].addEventListener(
      type,
      callback as EventListenerOrEventListenerObject,
      options,
    );
  }

  removeEventListener(
    type: string,
    listener: ((event: CustomEvent) => void) | EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void {
    if (this.listeners[type]) {
      this.listeners[type].removeEventListener(
        type,
        listener as EventListenerOrEventListenerObject,
        options,
      );
      delete this.listeners[type];
    }

    if (!Object.keys(this.listeners)) {
      window.removeEventListener("message", this.lazyOnWindowMessage, true);
    }
  }

  private lazyOnWindowMessage({ data }: MessageEvent<any>): any {
    if (typeof data !== "string") {
      return;
    }

    let message: unknown;
    try {
      message = JSON.parse(data);
    } catch (error) {
      return;
    }

    if (
      typeof message !== "object" ||
      !message ||
      !("channel" in message) ||
      typeof message.channel !== "string"
    ) {
      return;
    }

    const { channel } = message;
    const detail = "detail" in message ? message.detail : undefined;

    this.listeners[channel]?.dispatchEvent(new CustomEvent(channel, { detail }));
  }

  send(channel: string, detail?: CustomEvent["detail"]): void {
    if (!isReactNativeWebViewWindow(window)) {
      this.verbose && console.log(`send("${channel}", ${detail}) 1a`);
      throw new Error("Expected window.ReactNativeWebView to be populated, but got undefined.");
    }

    this.verbose && console.log(`send("${channel}", <detail>) 1b`);

    let message: string;
    try {
      message = JSON.stringify({
        namespace: "dubloon",
        type: "send",
        channel,
        detail,
      });
      this.verbose && console.log(`send("${channel}", <detail>) 2a`);
    } catch (cause) {
      this.verbose && console.log(`send("${channel}", <detail>) 2b`);
      throw new Error(
        "Unable to stringify IPC message. Make sure `detail` is a serialisable value.",
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
