/// <reference types="dubloon-electron-shim" />

declare namespace Dubloon {
  interface IpcMain extends NodeJS.EventEmitter {
    handle(channel: "ping", listener: (event: IpcMainInvokeEvent, sentAt: number) => number): void;

    on(channel: "counter-value", listener: (event: IpcMainEvent, value: number) => void): this;
  }
}
