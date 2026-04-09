/**
 * Minimal Writable stream subset, modeled on Node.js stream.Writable.
 *
 * Implements:
 *   - write(chunk, encoding?, callback?)
 *   - end(chunk?, encoding?, callback?)
 *   - destroy(error?)
 *
 * Architectured so the full Writable API can be layered on later.
 */

import { Buffer as RuntimeBuffer } from "buffer";

import { NodeEventEmitter } from "./NodeEventEmitter";

type NodeBuffer = import("buffer").Buffer;

export type NativeWriteFn = (childId: string, base64Data: string) => boolean;
export type NativeCloseStdinFn = (childId: string) => boolean;
export type EmitErrorFn = (error: Error) => void;

export class ChildWritable extends NodeEventEmitter {
  writable: boolean = true;
  writableEnded: boolean = false;
  writableFinished: boolean = false;
  destroyed: boolean = false;

  private _childId: string;
  private _nativeWrite: NativeWriteFn;
  private _nativeCloseStdin: NativeCloseStdinFn;
  private _emitError: EmitErrorFn;

  constructor(
    childId: string,
    nativeWrite: NativeWriteFn,
    nativeCloseStdin: NativeCloseStdinFn,
    emitError: EmitErrorFn,
  ) {
    super();
    this._childId = childId;
    this._nativeWrite = nativeWrite;
    this._nativeCloseStdin = nativeCloseStdin;
    this._emitError = emitError;
  }

  write(
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void,
  ): boolean {
    const cb = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    const encoding = typeof encodingOrCallback === "string" ? encodingOrCallback : "utf8";
    try {
      this._nativeWrite(this._childId, chunkToBase64(chunk, encoding));
      cb?.(null);
      return true;
    } catch (error: any) {
      cb?.(error);
      this._emitError(error);
      return false;
    }
  }

  end(
    chunkOrCallback?: string | Uint8Array | (() => void),
    encodingOrCallback?: BufferEncoding | (() => void),
    callback?: () => void,
  ): this {
    const cb =
      typeof chunkOrCallback === "function"
        ? chunkOrCallback
        : typeof encodingOrCallback === "function"
          ? encodingOrCallback
          : callback;

    if (chunkOrCallback != null && typeof chunkOrCallback !== "function") {
      const encoding = typeof encodingOrCallback === "string" ? encodingOrCallback : "utf8";
      this.write(chunkOrCallback, encoding);
    }

    this.writableEnded = true;
    try {
      this._nativeCloseStdin(this._childId);
    } catch {
      // stdin may already be closed
    }
    this.writable = false;
    this.writableFinished = true;
    this.emit("finish");
    (cb as (() => void) | undefined)?.();
    return this;
  }

  destroy(error?: Error): this {
    if (this.destroyed) return this;
    this.destroyed = true;
    try {
      this._nativeCloseStdin(this._childId);
    } catch {
      // ignore
    }
    this.writable = false;
    if (error) {
      this.emit("error", error);
    }
    this.emit("close");
    return this;
  }
}

function chunkToBase64(chunk: string | Uint8Array, encoding: string = "utf8"): string {
  let bytes: NodeBuffer;
  if (typeof chunk === "string") {
    bytes = RuntimeBuffer.from(chunk, encoding as BufferEncoding) as unknown as NodeBuffer;
  } else if (chunk instanceof Uint8Array) {
    bytes = RuntimeBuffer.from(chunk) as unknown as NodeBuffer;
  } else {
    throw new TypeError("Unsupported chunk type");
  }
  return bytesToBase64(bytes);
}

function bytesToBase64(bytes: Uint8Array): string {
  return RuntimeBuffer.from(bytes).toString("base64");
}
