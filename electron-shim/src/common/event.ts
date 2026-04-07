export class DubloonEvent implements Dubloon.Event {
  defaultPrevented = false;

  preventDefault(): void {
    this.defaultPrevented = true;
  }
}
