import type { WebView } from "react-native-webview";

import { DubloonEvent } from "./event";

export class IpcMainEventImpl extends DubloonEvent implements Dubloon.IpcMainEvent {
  readonly type = "frame";
  private readonly webView: WebView | null;

  constructor(webView: WebView | null) {
    super();
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

export class IpcMainInvokeEventImpl extends DubloonEvent implements Dubloon.IpcMainInvokeEvent {
  readonly type = "frame";
}

export class IpcRendererEventImpl extends DubloonEvent implements Dubloon.IpcRendererEvent {
  readonly sender: any;

  constructor(sender: any) {
    super();
    this.sender = sender;
  }
}
