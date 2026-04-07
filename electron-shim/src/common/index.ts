export function isWebViewMessage(message: unknown): message is WebViewMessage {
  if (
    typeof message !== "object" ||
    !message ||
    !("namespace" in message) ||
    message.namespace !== "dubloon" ||
    !("type" in message) ||
    typeof message.type !== "string" ||
    !("channel" in message) ||
    typeof message.channel !== "string"
  ) {
    return false;
  }

  return true;
}

export interface WebViewMessage {
  namespace: "dubloon";
  type: string;
  channel: string;
}

export function isSendMessage(message: WebViewMessage): message is SendMessage {
  if (message.type !== "send") {
    return false;
  }

  return true;
}

export interface SendMessage extends WebViewMessage {
  type: "send";
  detail: unknown;
}

export function isInvokeRequest(message: WebViewMessage): message is InvokeRequest {
  if (
    message.type !== "invoke-request" ||
    !("transactionId" in message) ||
    typeof message.transactionId !== "number"
  ) {
    return false;
  }

  return true;
}

export interface InvokeRequest extends WebViewMessage {
  type: "invoke-request";
  transactionId: number;
  detail: unknown;
}

export function isInvokeResponse(message: WebViewMessage): message is InvokeResponse {
  if (
    message.type !== "invoke-response" ||
    !("subtype" in message) ||
    (message.subtype !== "resolve" && message.subtype !== "reject") ||
    !("transactionId" in message) ||
    typeof message.transactionId !== "number" ||
    !("channel" in message) ||
    typeof message.channel !== "string"
  ) {
    return false;
  }

  return true;
}

export type InvokeResponse =
  | (WebViewMessage & {
      type: "invoke-response";
      subtype: "reject";
      transactionId: number;
      error: { message: string; stack: string | undefined } | undefined;
    })
  | (WebViewMessage & {
      type: "invoke-response";
      subtype: "resolve";
      transactionId: number;
      value: unknown;
    });

export function isInvokeResponseEvent(
  event: Event,
): event is CustomEvent<InvokeResponseEventDetail> {
  if (!(event instanceof CustomEvent)) {
    return false;
  }

  const { detail, type } = event as CustomEvent<unknown>;
  if (
    typeof detail !== "object" ||
    !detail ||
    type !== "invoke-response" ||
    !("transactionId" in detail) ||
    typeof detail.transactionId !== "number" ||
    !("subtype" in detail) ||
    (detail.subtype !== "reject" && detail.subtype !== "resolve")
  ) {
    return false;
  }

  return true;
}

export type InvokeResponseEventDetail =
  | {
      subtype: "reject";
      transactionId: number;
      error: { message: string; stack: string | undefined } | undefined;
    }
  | {
      subtype: "resolve";
      transactionId: number;
      value: unknown;
    };
