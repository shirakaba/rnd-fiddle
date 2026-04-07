import { Event } from "event-target-shim";

export class CustomEventImpl<T> extends Event implements CustomEvent<T> {
  constructor(type: string, eventInitDict?: CustomEventInit<T>) {
    super(type, eventInitDict);

    this.detail = eventInitDict?.detail as T;
  }

  /**
   * The read-only **`detail`** property of the CustomEvent interface returns any data passed when initializing the event.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CustomEvent/detail)
   */
  readonly detail: T;

  /**
   * The **`CustomEvent.initCustomEvent()`** method initializes a CustomEvent object. If the event has already been dispatched, this method does nothing.
   * @deprecated
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/CustomEvent/initCustomEvent)
   */
  initCustomEvent(type: string, bubbles?: boolean, cancelable?: boolean, detail?: T): void {
    throw new Error("Not implemented");
  }
}
