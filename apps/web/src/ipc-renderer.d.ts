/// <reference types="dubloon-electron-shim" />

declare namespace Dubloon {
  interface IpcRenderer extends NodeJS.EventEmitter {
    invoke(channel: "ping", dateNow: number): Promise<number>;

    send(channel: "counter-value", value: number): this;
  }
}
