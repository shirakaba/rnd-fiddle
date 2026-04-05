/// <reference lib="dom" />
/// <reference path="../dom-events-wintercg.d.ts" />

import { EventTarget } from "dom-events-wintercg";

class IpcRenderer extends EventTarget implements Dubloon.IpcRenderer {
  private readonly invokers: Record<string, EventTarget> = {};
  private invokeCount = 0;
  private readonly listeners: Record<string, EventTarget> = {};

  invoke(channel: string, detail?: CustomEvent["detail"]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!isReactNativeWebViewWindow(window)) {
        return reject(
          new Error("Expected window.ReactNativeWebView to be populated, but got undefined."),
        );
      }

      if (!Object.keys(this.invokers)) {
        window.addEventListener("message", this.lazyHandleInvokeResponse, true);
      }

      const transactionId = ++this.invokeCount;

      let invoker = this.invokers[channel];
      if (!invoker) {
        invoker = this.invokers[channel] = new EventTarget();
      }

      let removeEventHandler: () => void;
      const onEvent = (event: Event) => {
        if (!(event instanceof CustomEvent)) {
          return;
        }

        // We're expecting this.lazyHandleInvokeResponse() to pass along the
        // message from the WebView in this shape:
        // {
        //   type: "invoke-response",
        //   detail: {
        //     transactionId: 123,
        //     value: 456,
        //   },
        // }
        const { detail, type } = event as CustomEvent<unknown>;
        if (
          typeof detail !== "object" ||
          !detail ||
          type !== "invoke-response" ||
          !("transactionId" in detail) ||
          detail.transactionId !== transactionId
        ) {
          return;
        }

        const value = "value" in detail ? detail.value : undefined;

        // FIXME: Although we've removed the event listener, we can't tell
        // whether it's safe to delete our reference to the EventTarget (there's
        // no public API for checking listener count). So we will accumulate
        // a new EventTarget each time invoke() is called on a new channel.
        //
        // Could be fixed by using a model of one EventTarget per invoke() call,
        // instead of one shared EventTarget for each channel. But also unlikely
        // to be a significant leak in any real-world app anyway.
        removeEventHandler();
        resolve(value);
      };
      invoker.addEventListener(channel, onEvent);
      removeEventHandler = () => {
        invoker.removeEventListener(channel, onEvent);
      };

      let message: string;
      try {
        message = JSON.stringify({
          namespace: "dubloon",
          type: "invoke-request",
          transactionId,
          channel,
          detail,
        });
      } catch (cause) {
        return reject(
          new Error(
            "Unable to stringify IPC message. Make sure `detail` is a serialisable value.",
            { cause },
          ),
        );
      } finally {
        removeEventHandler();
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

    // We're expecting the WebView to send us:
    // {
    //   namespace: "dubloon",
    //   type: "invoke-response",
    //   transactionId: 123,
    //   channel: "ping",
    //   detail: 456,
    // }

    if (
      typeof message !== "object" ||
      !message ||
      !("type" in message) ||
      message.type !== "invoke-response" ||
      !("transactionId" in message) ||
      typeof message.transactionId !== "number" ||
      !("channel" in message) ||
      typeof message.channel !== "string"
    ) {
      return;
    }

    const { channel, transactionId } = message;
    const value = "detail" in message ? message.detail : undefined;

    this.invokers[channel]?.dispatchEvent(
      new CustomEvent(message.type, {
        detail: {
          transactionId,
          value,
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
