declare namespace Dubloon {
  interface WindowMessageEventMap {
    /**
     * The number of milliseconds since epoch that this message was received.
     */
    ping: number;
  }

  interface IpcMain extends EventTarget {
    /**
     * Adds a handler for an `invoke`able IPC. This handler will be called whenever a
     * renderer calls `ipcRenderer.invoke(channel, ...args)`.
     *
     * If `listener` returns a Promise, the eventual result of the promise will be
     * returned as a reply to the remote caller. Otherwise, the return value of the
     * listener will be used as the value of the reply.
     *
     * The `event` that is passed as the first argument to the handler is the same as
     * that passed to a regular event listener. It includes information about which
     * WebContents is the source of the invoke request.
     *
     * Errors thrown through `handle` in the main process are not transparent as they
     * are serialized and only the `message` property from the original error is
     * provided to the renderer process. Please refer to #24427 for details.
     */
    handle(channel: string, listener: (event: IpcMainInvokeEvent) => Promise<any> | any): void;

    /**
     * Handles a single `invoke`able IPC message, then removes the listener. See
     * `ipcMain.handle(channel, listener)`.
     */
    handleOnce(channel: string, listener: (event: IpcMainInvokeEvent) => Promise<any> | any): void;
  }

  interface IpcMainInvokeEvent extends CustomEvent {
    // Docs: https://electronjs.org/docs/api/structures/ipc-main-invoke-event

    /**
     * The ID of the renderer frame that sent this message
     */
    frameId: number;
    /**
     * The internal ID of the renderer process that sent this message
     */
    processId: number;
    /**
     * Returns the `webContents` that sent the message
     */
    sender: WebContents;
    /**
     * The frame that sent this message. May be `null` if accessed after the frame has
     * either navigated or been destroyed.
     *
     */
    readonly senderFrame: /* WebFrameMain | */ null;
    /**
     * Possible values include `frame`
     */
    type: "frame";
  }

  interface IpcRenderer extends EventTarget {
    // Docs: https://electronjs.org/docs/api/ipc-renderer

    /**
     * Alias for `ipcRenderer.on`.
     */
    addEventListener(channel: string, listener: (event: CustomEvent) => void): void;

    /**
     * Resolves with the response from the main process.
     *
     * Send a message to the main process via `channel` and expect a result
     * asynchronously. Arguments will be serialized with the Structured Clone
     * Algorithm, just like `window.postMessage`, so prototype chains will not be
     * included. Sending Functions, Promises, Symbols, WeakMaps, or WeakSets will throw
     * an exception.
     *
     * The main process should listen for `channel` with `ipcMain.handle()`.
     *
     * For example:
     *
     * If you need to transfer a `MessagePort` to the main process, use
     * `ipcRenderer.postMessage`.
     *
     * If you do not need a response to the message, consider using `ipcRenderer.send`.
     *
     * > [!NOTE] Sending non-standard JavaScript types such as DOM objects or special
     * Electron objects will throw an exception.
     *
     * Since the main process does not have support for DOM objects such as
     * `ImageBitmap`, `File`, `DOMMatrix` and so on, such objects cannot be sent over
     * Electron's IPC to the main process, as the main process would have no way to
     * decode them. Attempting to send such objects over IPC will result in an error.
     *
     * > [!NOTE] If the handler in the main process throws an error, the promise
     * returned by `invoke` will reject. However, the `Error` object in the renderer
     * process will not be the same as the one thrown in the main process.
     */
    invoke(channel: string, detail?: CustomEvent["detail"]): Promise<any>;

    /**
     * Alias for `ipcRenderer.off`.
     */
    removeEventListener(channel: string, listener: (event: CustomEvent) => void): void;

    /**
     * Send an asynchronous message to the main process via `channel`, along with
     * arguments. Arguments will be serialized with the Structured Clone Algorithm,
     * just like `window.postMessage`, so prototype chains will not be included.
     * Sending Functions, Promises, Symbols, WeakMaps, or WeakSets will throw an
     * exception.
     *
     * > **NOTE:** Sending non-standard JavaScript types such as DOM objects or special
     * Electron objects will throw an exception.
     *
     * Since the main process does not have support for DOM objects such as
     * `ImageBitmap`, `File`, `DOMMatrix` and so on, such objects cannot be sent over
     * Electron's IPC to the main process, as the main process would have no way to
     * decode them. Attempting to send such objects over IPC will result in an error.
     *
     * The main process handles it by listening for `channel` with the `ipcMain`
     * module.
     *
     * If you need to transfer a `MessagePort` to the main process, use
     * `ipcRenderer.postMessage`.
     *
     * If you want to receive a single response from the main process, like the result
     * of a method call, consider using `ipcRenderer.invoke`.
     */
    send(channel: string, detail?: CustomEvent["detail"]): void;
  }

  namespace CrossProcessExports {
    const ipcMain: IpcMain;
    type IpcMain = Dubloon.IpcMain;
    const ipcRenderer: IpcRenderer;
    type IpcRenderer = Dubloon.IpcRenderer;
  }

  namespace Main {
    const ipcMain: IpcMain;
    type IpcMain = Dubloon.IpcMain;
  }

  namespace Renderer {
    const ipcRenderer: IpcRenderer;
    type IpcRenderer = Dubloon.IpcRenderer;
  }

  const ipcMain: IpcMain;
  const ipcRenderer: IpcRenderer;
}

declare module "dubloon-electron-shim" {
  export = Dubloon.CrossProcessExports;
}

declare module "dubloon-electron-shim/main" {
  export = Dubloon.Main;
}

declare module "dubloon-electron-shim/renderer" {
  export = Dubloon.Renderer;
}

interface NodeRequireFunction {
  (moduleName: "dubloon-electron-shim"): typeof Dubloon.CrossProcessExports;
  (moduleName: "dubloon-electron-shim/main"): typeof Dubloon.Main;
  (moduleName: "dubloon-electron-shim/renderer"): typeof Dubloon.Renderer;
}

interface NodeRequire {
  (moduleName: "dubloon-electron-shim"): typeof Dubloon.CrossProcessExports;
  (moduleName: "dubloon-electron-shim/main"): typeof Dubloon.Main;
  (moduleName: "dubloon-electron-shim/renderer"): typeof Dubloon.Renderer;
}
