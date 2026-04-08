/**
 * Minimal Readable stream subset, modeled on Node.js stream.Readable.
 *
 * Implements the event-based API surface that fiddle-core.ts depends on:
 *   - on('data', chunk => ...)
 *   - on('end', () => ...)
 *   - on('close', () => ...)
 *   - on('error', err => ...)
 *   - pipe(destination)
 *   - setEncoding(encoding)
 *   - destroy()
 *   - pause() / resume()
 *
 * Architectured so the full Readable API can be layered on later without
 * breaking changes.
 */

import { NodeEventEmitter } from "./NodeEventEmitter";

export class ChildReadable extends NodeEventEmitter {
  readable: boolean = true;
  readableEncoding: string | null = null;
  readableEnded: boolean = false;
  readableFlowing: boolean | null = null;
  destroyed: boolean = false;

  private _paused: boolean = false;
  private _queue: Uint8Array[] = [];

  setEncoding(encoding: string): this {
    this.readableEncoding = encoding;
    return this;
  }

  read(_size?: number): any {
    return null;
  }

  pause(): this {
    this._paused = true;
    this.readableFlowing = false;
    this.emit("pause");
    return this;
  }

  resume(): this {
    this._paused = false;
    this.readableFlowing = true;
    this.emit("resume");
    while (this._queue.length > 0) {
      const chunk = this._queue.shift()!;
      this.emit("data", this._formatChunk(chunk));
    }
    return this;
  }

  pipe<T extends { write(chunk: any): any }>(destination: T, _options?: { end?: boolean }): T {
    this.readableFlowing = true;
    this.on("data", (chunk: any) => {
      destination.write(chunk);
    });
    return destination;
  }

  destroy(error?: Error): this {
    if (this.destroyed) return this;
    this.destroyed = true;
    this.readable = false;
    if (error) {
      this.emit("error", error);
    }
    this.emit("close");
    return this;
  }

  // ── Internal methods (called by ChildProcess) ────────────────────────────

  /** Push a base64-encoded chunk received from the native module. */
  _pushBase64Chunk(base64: string): void {
    const bytes = base64ToBytes(base64);
    if (this._paused) {
      this._queue.push(bytes);
      return;
    }
    if (this.readableFlowing === null) {
      this.readableFlowing = true;
    }
    this.emit("data", this._formatChunk(bytes));
  }

  /** Signal that the native stream has ended. */
  _end(): void {
    if (this.readableEnded) return;
    this.readableEnded = true;
    this.readable = false;
    this.emit("end");
    this.emit("close");
  }

  private _formatChunk(bytes: Uint8Array): string | Uint8Array {
    if (this.readableEncoding) {
      return new TextDecoder(this.readableEncoding).decode(bytes);
    }
    return bytes;
  }
}

function base64ToBytes(base64: string): Uint8Array {
  if (!base64) return new Uint8Array(0);
  if (typeof globalThis.Buffer !== "undefined") {
    return new Uint8Array(globalThis.Buffer.from(base64, "base64"));
  }
  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(base64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
  throw new Error("Base64 decoding not available in this runtime");
}
