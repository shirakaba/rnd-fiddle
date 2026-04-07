import type { WebView } from "react-native-webview";

import { DubloonEvent } from "./event";

export class IpcMainEventImpl extends DubloonEvent {
  readonly frameId = 0;
  readonly ports: [] = [];
  readonly processId = 0;
  returnValue: any = undefined;
  readonly sender = null as never;
  readonly senderFrame = null;
  readonly type = "frame";
  private readonly webView: WebView | null;

  constructor(webView: WebView | null) {
    super("frame");
    this.webView = webView;
  }

  reply(channel: string, ...args: unknown[]): void {
    this.webView?.postMessage(
      JSON.stringify({
        namespace: "dubloon",
        type: "send",
        channel,
        args,
      }),
    );
  }
}

export class IpcMainInvokeEventImpl extends DubloonEvent {
  readonly frameId = 0;
  readonly processId = 0;
  readonly sender = null as never;
  readonly senderFrame = null;
  readonly type = "frame";

  constructor() {
    super("frame");
  }
}

export class IpcRendererEventImpl extends DubloonEvent {
  readonly ports: [] = [];
  readonly sender: any;

  constructor(sender: any) {
    super("ipc-renderer");
    this.sender = sender;
  }
}
