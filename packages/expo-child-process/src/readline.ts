/**
 * readline module, following the Node.js source at
 * https://github.com/nodejs/node/blob/main/lib/readline.js
 * https://github.com/nodejs/node/blob/main/lib/internal/readline/interface.js
 *
 * Implements enough of the node:readline API to support:
 *   - createInterface({ input, output })
 *   - rl.on('line', (line) => { ... })
 *   - rl.close()
 *
 * The line-splitting logic faithfully mirrors Node's non-TTY path:
 * UTF-8 StringDecoder + kLine_buffer + global lineEnding regex, with
 * crlfDelay support.
 */

import { NodeEventEmitter } from "./NodeEventEmitter";

// ── Line ending regex from Node.js ─────────────────────────────────────────
// \r\n, \n, \r not followed by \n, U+2028, U+2029
const lineEnding = /\r?\n|\r(?!\n)|\u2028|\u2029/g;

const kMinCrlfDelay = 100;

// ── Minimal StringDecoder polyfill for utf-8 ───────────────────────────────
// Node uses `string_decoder` to handle multi-byte UTF-8 sequences that may be
// split across chunks. We provide a minimal implementation that handles the
// common case: Buffer/Uint8Array input decoded as UTF-8, and string input
// passed through.

class Utf8Decoder {
  private _buffer: number[] = [];

  write(data: string | Uint8Array | Buffer): string {
    if (typeof data === "string") return data;

    const bytes =
      data instanceof Uint8Array ? data : new Uint8Array(data as unknown as ArrayBufferLike);

    if (this._buffer.length > 0) {
      const merged = new Uint8Array(this._buffer.length + bytes.length);
      merged.set(this._buffer);
      merged.set(bytes, this._buffer.length);
      this._buffer = [];
      return this._decodeWithIncomplete(merged);
    }

    return this._decodeWithIncomplete(bytes);
  }

  end(): string {
    if (this._buffer.length === 0) return "";
    const remaining = new Uint8Array(this._buffer);
    this._buffer = [];
    return new TextDecoder("utf-8", { fatal: false }).decode(remaining);
  }

  private _decodeWithIncomplete(bytes: Uint8Array): string {
    // Check if the last 1-3 bytes are an incomplete UTF-8 sequence
    let trailingIncomplete = 0;
    const len = bytes.length;
    if (len > 0) {
      const last = bytes[len - 1];
      if ((last & 0x80) !== 0) {
        // Might be in the middle of a multi-byte sequence
        trailingIncomplete = this._incompleteTrailingBytes(bytes);
      }
    }

    if (trailingIncomplete > 0) {
      const decodable = bytes.subarray(0, len - trailingIncomplete);
      this._buffer = Array.from(bytes.subarray(len - trailingIncomplete));
      return new TextDecoder("utf-8", { fatal: false }).decode(decodable);
    }

    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  private _incompleteTrailingBytes(bytes: Uint8Array): number {
    const len = bytes.length;
    // Walk backwards from end to find a leading byte
    for (let i = Math.min(3, len - 1); i >= 0; i--) {
      const idx = len - 1 - i;
      const byte = bytes[idx];
      if ((byte & 0xc0) !== 0x80) {
        // This is a leading byte – determine expected sequence length
        let expected: number;
        if ((byte & 0x80) === 0) expected = 1;
        else if ((byte & 0xe0) === 0xc0) expected = 2;
        else if ((byte & 0xf0) === 0xe0) expected = 3;
        else if ((byte & 0xf8) === 0xf0) expected = 4;
        else return 0;

        const actual = i + 1;
        return actual < expected ? actual : 0;
      }
    }
    return 0;
  }
}

// ── ReadlineInterface ──────────────────────────────────────────────────────
// This is the runtime class backing `readline.Interface`. We don't export it
// directly as the class name – instead we cast through `createInterface` to
// match the Node.js typings.

class ReadlineInterface extends NodeEventEmitter {
  readonly terminal: boolean;
  line: string = "";
  cursor: number = 0;
  closed: boolean = false;
  paused: boolean = false;

  input: NodeJS.ReadableStream;
  output: NodeJS.WritableStream | undefined;
  completer: import("readline").Completer | import("readline").AsyncCompleter | undefined;
  crlfDelay: number;

  private _prompt: string = "> ";
  private _lineBuffer: string | null = null;
  private _decoder: Utf8Decoder = new Utf8Decoder();
  private _sawReturnAt: number = 0;
  private _questionCallback: ((answer: string) => void) | null = null;
  private _oldPrompt: string = "> ";

  private _ondata: ((data: any) => void) | null = null;
  private _onend: (() => void) | null = null;
  private _onerror: ((err: Error) => void) | null = null;
  private _onSelfClose: (() => void) | null = null;

  constructor(
    inputOrOptions: NodeJS.ReadableStream | import("readline").ReadLineOptions,
    output?: NodeJS.WritableStream,
    completer?: import("readline").Completer | import("readline").AsyncCompleter,
    terminal?: boolean,
  ) {
    super();

    let input: NodeJS.ReadableStream;
    let crlfDelay: number | undefined;
    let signal: AbortSignal | undefined;

    if (inputOrOptions && typeof inputOrOptions === "object" && "input" in inputOrOptions) {
      const options = inputOrOptions as import("readline").ReadLineOptions;
      input = options.input;
      output = options.output;
      completer = options.completer;
      terminal = options.terminal;
      crlfDelay = options.crlfDelay;
      signal = options.signal;

      if (options.prompt !== undefined) {
        this._prompt = options.prompt;
      }
    } else {
      input = inputOrOptions as NodeJS.ReadableStream;
    }

    if (terminal === undefined && output != null) {
      terminal = !!(output as any).isTTY;
    }

    this.input = input;
    this.output = output;
    this.completer = completer;
    this.terminal = !!terminal;
    this.crlfDelay = crlfDelay ? Math.max(kMinCrlfDelay, crlfDelay) : kMinCrlfDelay;

    const self = this;

    this._onerror = (err: Error) => {
      self.emit("error", err);
    };

    this._ondata = (data: any) => {
      self._normalWrite(data);
    };

    this._onend = () => {
      if (typeof self._lineBuffer === "string" && self._lineBuffer.length > 0) {
        self.emit("line", self._lineBuffer);
      }
      self.close();
    };

    this._onSelfClose = () => {
      input.removeListener("data", self._ondata!);
      input.removeListener("error", self._onerror!);
      input.removeListener("end", self._onend!);
    };

    input.on("error", this._onerror);

    // We only implement the non-terminal path. The terminal (TTY) path
    // requires emitKeypressEvents, raw mode, and the full line-editing
    // machinery, which is out of scope.
    input.on("data", this._ondata);
    input.on("end", this._onend);
    this.once("close", this._onSelfClose);

    if (signal) {
      const onAborted = () => self.close();
      if (signal.aborted) {
        queueMicrotask(onAborted);
      } else {
        signal.addEventListener("abort", onAborted, { once: true });
        self.once("close", () => {
          signal!.removeEventListener("abort", onAborted);
        });
      }
    }

    input.resume();
  }

  // ── Public API ──────────────────────────────────────────────────────────

  getPrompt(): string {
    return this._prompt;
  }

  setPrompt(prompt: string): void {
    this._prompt = prompt;
  }

  prompt(_preserveCursor?: boolean): void {
    if (this.paused) this.resume();
    if (this.output) {
      (this.output as any).write(this._prompt);
    }
  }

  question(query: string, callback: (answer: string) => void): void;
  question(
    query: string,
    options: { signal?: AbortSignal },
    callback: (answer: string) => void,
  ): void;
  question(
    query: string,
    optionsOrCallback: ((answer: string) => void) | { signal?: AbortSignal },
    callback?: (answer: string) => void,
  ): void {
    if (this.closed) {
      throw new Error("readline was closed");
    }
    let cb: (answer: string) => void;
    if (typeof optionsOrCallback === "function") {
      cb = optionsOrCallback;
    } else {
      cb = callback!;
    }
    this._oldPrompt = this._prompt;
    this.setPrompt(query);
    this._questionCallback = cb;
    this.prompt();
  }

  pause(): this {
    if (this.paused) return this;
    this.input.pause();
    this.paused = true;
    this.emit("pause");
    return this;
  }

  resume(): this {
    if (!this.paused) return this;
    this.input.resume();
    this.paused = false;
    this.emit("resume");
    return this;
  }

  close(): void {
    if (this.closed) return;
    this.pause();
    this.closed = true;
    this.emit("close");
  }

  [Symbol.dispose](): void {
    this.close();
  }

  write(data: string | Buffer, key?: import("readline").Key): void;
  write(data: undefined | null | string | Buffer, key: import("readline").Key): void;
  write(data: string | Buffer | undefined | null, _key?: import("readline").Key): void {
    if (data != null) {
      this._normalWrite(data);
    }
  }

  getCursorPos(): import("readline").CursorPos {
    return { rows: 0, cols: this.cursor };
  }

  // ── Line splitting (mirrors Node's [kNormalWrite]) ──────────────────────

  private _onLine(line: string): void {
    if (this._questionCallback) {
      const cb = this._questionCallback;
      this._questionCallback = null;
      this.setPrompt(this._oldPrompt);
      cb(line);
    } else {
      this.emit("line", line);
    }
  }

  private _normalWrite(b: string | Uint8Array | Buffer | undefined): void {
    if (b === undefined) return;

    let string = this._decoder.write(b as any);

    // crlfDelay: if we just saw \r and the next chunk starts with \n
    // within the delay window, strip the leading \n so \r\n counts as one
    // line break.
    if (this._sawReturnAt && Date.now() - this._sawReturnAt <= this.crlfDelay) {
      if (string.codePointAt(0) === 10) {
        string = string.slice(1);
      }
      this._sawReturnAt = 0;
    }

    lineEnding.lastIndex = 0;
    let newPartContainsEnding = lineEnding.exec(string);

    if (newPartContainsEnding !== null) {
      if (this._lineBuffer) {
        string = this._lineBuffer + string;
        this._lineBuffer = null;
        lineEnding.lastIndex = 0;
        newPartContainsEnding = lineEnding.exec(string);
      }

      this._sawReturnAt = string.endsWith("\r") ? Date.now() : 0;

      const indexes = [0, newPartContainsEnding!.index, lineEnding.lastIndex];
      let nextMatch;
      while ((nextMatch = lineEnding.exec(string)) !== null) {
        indexes.push(nextMatch.index, lineEnding.lastIndex);
      }
      const lastIndex = indexes.length - 1;
      this._lineBuffer = string.slice(indexes[lastIndex]);
      for (let i = 1; i < lastIndex; i += 2) {
        this._onLine(string.slice(indexes[i - 1], indexes[i]));
      }
    } else if (string) {
      if (this._lineBuffer) {
        this._lineBuffer += string;
      } else {
        this._lineBuffer = string;
      }
    }
  }

  // ── Async iterator (out of scope, stubbed) ──────────────────────────────

  [Symbol.asyncIterator](): AsyncIterableIterator<string> {
    throw new Error("readline async iterator is not implemented");
  }
}

// ── createInterface ────────────────────────────────────────────────────────

const createInterfaceImpl: typeof import("node:readline").createInterface = (
  inputOrOptions: any,
  output?: any,
  completer?: any,
  terminal?: any,
) => {
  return new ReadlineInterface(
    inputOrOptions,
    output,
    completer,
    terminal,
  ) as unknown as import("readline").Interface;
};

export const createInterface = createInterfaceImpl;

// ── Stub exports for the rest of the readline API surface ──────────────────

export const emitKeypressEvents: typeof import("node:readline").emitKeypressEvents = (
  _stream,
  _readlineInterface?,
) => {
  throw new Error("readline.emitKeypressEvents() is not implemented");
};

export const clearLine: typeof import("node:readline").clearLine = (_stream, _dir, _callback?) => {
  throw new Error("readline.clearLine() is not implemented");
};

export const clearScreenDown: typeof import("node:readline").clearScreenDown = (
  _stream,
  _callback?,
) => {
  throw new Error("readline.clearScreenDown() is not implemented");
};

export const cursorTo: typeof import("node:readline").cursorTo = (_stream, _x, _y?, _callback?) => {
  throw new Error("readline.cursorTo() is not implemented");
};

export const moveCursor: typeof import("node:readline").moveCursor = (
  _stream,
  _dx,
  _dy,
  _callback?,
) => {
  throw new Error("readline.moveCursor() is not implemented");
};

export type { ReadlineInterface as Interface };
export type {
  ReadLineOptions,
  Completer,
  AsyncCompleter,
  CompleterResult,
  Key,
  ReadLine,
  CursorPos,
  Direction,
} from "readline";
