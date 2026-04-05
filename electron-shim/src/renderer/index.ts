/// <reference lib="dom" />
/// <reference path="../dom-events-wintercg.d.ts" />

import { EventTarget } from "dom-events-wintercg";

class IpcRenderer extends EventTarget implements Dubloon.IpcRenderer {
  private readonly listeners: Record<string, EventTarget> = {};

  invoke(channel: string, detail?: CustomEvent["detail"]): Promise<any> {
    // this.dispatchEvent(new CustomEvent(channel, { detail }));

    throw new Error("Not implemented");
  }

  addEventListener(
    type: string,
    callback: ((event: CustomEvent<any>) => void) | EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions | undefined,
  ): void {
    if (!Object.keys(this.listeners)) {
      window.addEventListener("message", this.onWindowMessage, true);
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
      window.removeEventListener("message", this.onWindowMessage, true);
    }
  }

  private onWindowMessage({ data }: MessageEvent<any>): any {
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
      message === null ||
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

export const ipcRenderer = new IpcRenderer();
