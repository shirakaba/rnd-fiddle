// (re-)export all cross-process exports
export { ipcMain } from "./main";
export { ipcRenderer } from "./renderer";
import EventEmitter from "eventemitter3";

export { EventEmitter as NodeEventEmitter };
