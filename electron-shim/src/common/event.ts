export class DubloonEvent implements Dubloon.Event {
  readonly NONE = 0;
  readonly CAPTURING_PHASE = 1;
  readonly AT_TARGET = 2;
  readonly BUBBLING_PHASE = 3;

  bubbles = false;
  cancelBubble = false;
  cancelable = false;
  composed = false;
  currentTarget: EventTarget | null = null;
  defaultPrevented = false;
  eventPhase = 0;
  isTrusted = false;
  returnValue = true;
  srcElement: EventTarget | null = null;
  target: EventTarget | null = null;
  timeStamp = Date.now();
  type: string;

  constructor(type: string) {
    this.type = type;
  }

  composedPath(): EventTarget[] {
    return [];
  }

  initEvent(type: string, bubbles = false, cancelable = false): void {
    this.type = type;
    this.bubbles = bubbles;
    this.cancelable = cancelable;
  }

  preventDefault(): void {
    if (!this.cancelable) {
      return;
    }

    this.defaultPrevented = true;
    this.returnValue = false;
  }

  stopImmediatePropagation(): void {
    this.cancelBubble = true;
  }

  stopPropagation(): void {
    this.cancelBubble = true;
  }
}
