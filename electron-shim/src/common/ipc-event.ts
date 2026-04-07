import type { WebView } from "react-native-webview";

import { ElectronEvent } from "./event";

function postMessage(
  webView: WebView | null,
  message: {
    namespace: "dubloon";
    type: "send";
    channel: string;
    args: unknown[];
  },
) {
  webView?.postMessage(JSON.stringify(message));
}

export class IpcMainEventImpl extends ElectronEvent {
  readonly frameId = 0;
  readonly ports: [] = [];
  readonly processId = 0;
  returnValue: any = undefined;
  readonly sender = null as never;
  readonly senderFrame = null;
  readonly type = "frame";
  private readonly webView: WebView | null;
  private readonly sendMessage: (
    webView: WebView | null,
    message: {
      namespace: "dubloon";
      type: "send";
      channel: string;
      args: unknown[];
    },
  ) => void;

  constructor(
    webView: WebView | null,
    sendMessage: (
      webView: WebView | null,
      message: {
        namespace: "dubloon";
        type: "send";
        channel: string;
        args: unknown[];
      },
    ) => void = postMessage,
  ) {
    super("frame");
    this.webView = webView;
    this.sendMessage = sendMessage;
  }

  reply(channel: string, ...args: unknown[]): void {
    this.sendMessage(this.webView, {
      namespace: "dubloon",
      type: "send",
      channel,
      args,
    });
  }
}

export class IpcMainInvokeEventImpl extends ElectronEvent {
  readonly frameId = 0;
  readonly processId = 0;
  readonly sender = null as never;
  readonly senderFrame = null;
  readonly type = "frame";

  constructor() {
    super("frame");
  }
}

export class IpcRendererEventImpl extends ElectronEvent {
  readonly ports: [] = [];
  readonly sender: any;

  constructor(sender: any) {
    super("ipc-renderer");
    this.sender = sender;
  }
}
