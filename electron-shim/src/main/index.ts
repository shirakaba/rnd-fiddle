/// <reference lib="dom" />
/// <reference path="../dom-events-wintercg.d.ts" />

import { EventTarget } from "dom-events-wintercg";

type Listener = Parameters<IpcMain["handle"]>[1];

// WIP - currently non-functional
class IpcMain extends EventTarget implements Dubloon.IpcMain {
  private readonly handles: Record<string, Listener> = {};

  handle(channel: string, listener: (event: Dubloon.IpcMainInvokeEvent) => Promise<any> | any) {
    this.handles[channel] = listener;
    this.addEventListener(channel, (event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }

      listener(event as Dubloon.IpcMainInvokeEvent);
    });
  }

  handleOnce(
    channel: string,
    listener: (event: Dubloon.IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any,
  ): void {}
}

export const ipcMain = new IpcMain();
