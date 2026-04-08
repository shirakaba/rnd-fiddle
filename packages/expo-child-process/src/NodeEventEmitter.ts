import EventEmitter from "eventemitter3";

/**
 * Extends eventemitter3's EventEmitter with stubs for the Node.js EventEmitter
 * methods that eventemitter3 does not implement. These can be fleshed out in a
 * follow-up pass if needed.
 */
export class NodeEventEmitter extends EventEmitter {
  getMaxListeners(): number {
    throw new Error("Not implemented");
  }

  setMaxListeners(_n: number): this {
    throw new Error("Not implemented");
  }

  rawListeners(_event: string | symbol): ((...args: any[]) => void)[] {
    throw new Error("Not implemented");
  }

  prependListener(_event: string | symbol, _fn: (...args: any[]) => void): this {
    throw new Error("Not implemented");
  }

  prependOnceListener(_event: string | symbol, _fn: (...args: any[]) => void): this {
    throw new Error("Not implemented");
  }
}
