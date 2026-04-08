/**
 * ChildProcess class, modeled 1:1 on Node.js child_process.ChildProcess.
 *
 * Extends EventEmitter (via eventemitter3) and emits:
 *   - 'spawn'
 *   - 'exit'    (code, signal)
 *   - 'close'   (code, signal)
 *   - 'error'   (err)
 *   - 'disconnect'
 *   - 'message' (commented out — requires IPC / node:net)
 */

import type { NativeChildProcessEvent } from "./types";

import { ChildReadable } from "./ChildReadable";
import { ChildWritable } from "./ChildWritable";
import {
  NativeModule,
  registerChildProcess,
  unregisterChildProcess,
} from "./ExpoChildProcessNative";
import { NodeEventEmitter } from "./NodeEventEmitter";

export class ChildProcess extends NodeEventEmitter {
  stdin: ChildWritable | null = null;
  stdout: ChildReadable | null = null;
  stderr: ChildReadable | null = null;

  readonly stdio: [
    ChildWritable | null,
    ChildReadable | null,
    ChildReadable | null,
    ChildReadable | ChildWritable | null | undefined,
    ChildReadable | ChildWritable | null | undefined,
  ] = [null, null, null, null, null];

  // readonly channel?: undefined; // No IPC support
  pid: number | undefined = undefined;
  readonly connected: boolean = false;
  exitCode: number | null = null;
  signalCode: string | null = null;
  spawnargs: string[] = [];
  spawnfile: string = "";
  killed: boolean = false;

  /** @internal */ _id: string = "";
  private _exited: boolean = false;
  private _closed: boolean = false;
  private _closesNeeded: number = 1;
  private _closesGot: number = 0;
  private _timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  kill(signal?: string | number): boolean {
    if (typeof signal === "number") {
      const names: Record<number, string> = {};
      // Reverse lookup from constants — inline to avoid circular deps
      const signalMap: Record<string, number> = {
        SIGHUP: 1,
        SIGINT: 2,
        SIGQUIT: 3,
        SIGILL: 4,
        SIGTRAP: 5,
        SIGABRT: 6,
        SIGEMT: 7,
        SIGFPE: 8,
        SIGKILL: 9,
        SIGBUS: 10,
        SIGSEGV: 11,
        SIGSYS: 12,
        SIGPIPE: 13,
        SIGALRM: 14,
        SIGTERM: 15,
        SIGURG: 16,
        SIGSTOP: 17,
        SIGTSTP: 18,
        SIGCONT: 19,
        SIGCHLD: 20,
        SIGTTIN: 21,
        SIGTTOU: 22,
        SIGIO: 23,
        SIGXCPU: 24,
        SIGXFSZ: 25,
        SIGVTALRM: 26,
        SIGPROF: 27,
        SIGWINCH: 28,
        SIGINFO: 29,
        SIGUSR1: 30,
        SIGUSR2: 31,
      };
      for (const [n, v] of Object.entries(signalMap)) names[v] = n;
      signal = names[signal] ?? "SIGTERM";
    }

    const signalName = signal ?? "SIGTERM";
    try {
      const didKill = NativeModule.kill(this._id, signalName);
      if (didKill) this.killed = true;
      return didKill;
    } catch {
      return false;
    }
  }

  [Symbol.dispose](): void {
    this.kill("SIGTERM");
  }

  // IPC — commented out, requires node:net SendHandle
  // send(message: Serializable, callback?: (error: Error | null) => void): boolean;
  // send(message: Serializable, sendHandle?: SendHandle, callback?: ...): boolean;
  // send(message: Serializable, sendHandle?: SendHandle, options?: MessageOptions, callback?: ...): boolean;

  disconnect(): void {
    throw new Error("IPC is not supported in expo-child-process");
  }

  ref(): void {
    // no-op in React Native context
  }

  unref(): void {
    // no-op in React Native context
  }

  // ── Internal: called by spawn() ──────────────────────────────────────────

  /** @internal */
  _spawn(
    id: string,
    pid: number,
    spawnfile: string,
    spawnargs: string[],
    stdioCfg: string[],
  ): void {
    this._id = id;
    this.pid = pid;
    this.spawnfile = spawnfile;
    this.spawnargs = spawnargs;

    const stdinMode = stdioCfg[0] ?? "pipe";
    const stdoutMode = stdioCfg[1] ?? "pipe";
    const stderrMode = stdioCfg[2] ?? "pipe";

    if (stdinMode === "pipe") {
      this.stdin = new ChildWritable(
        id,
        NativeModule.writeToStdin.bind(NativeModule),
        NativeModule.closeStdin.bind(NativeModule),
        (err: Error) => this.emit("error", err),
      );
    }

    if (stdoutMode === "pipe") {
      this.stdout = new ChildReadable();
      this._closesNeeded++;
    }

    if (stderrMode === "pipe") {
      this.stderr = new ChildReadable();
      this._closesNeeded++;
    }

    (this.stdio as any)[0] = this.stdin;
    (this.stdio as any)[1] = this.stdout;
    (this.stdio as any)[2] = this.stderr;

    registerChildProcess(id, this);
  }

  /** @internal */
  _setupTimeout(timeout: number, killSignal: string): void {
    if (timeout > 0) {
      this._timeoutHandle = setTimeout(() => {
        try {
          this.kill(killSignal);
        } catch (err: any) {
          this.emit("error", err);
        }
        this._timeoutHandle = null;
      }, timeout);

      this.once("exit", () => {
        if (this._timeoutHandle) {
          clearTimeout(this._timeoutHandle);
          this._timeoutHandle = null;
        }
      });
    }
  }

  /** @internal */
  _setupAbortSignal(signal: AbortSignal, killSignal: string): void {
    if (signal.aborted) {
      queueMicrotask(() => this._abortChildProcess(killSignal, signal.reason));
    } else {
      const onAbort = () => this._abortChildProcess(killSignal, signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
      this.once("exit", () => {
        signal.removeEventListener("abort", onAbort);
      });
    }
  }

  private _abortChildProcess(killSignal: string, reason?: any): void {
    try {
      if (this.kill(killSignal)) {
        const err = new Error("The operation was aborted");
        (err as any).code = "ABORT_ERR";
        (err as any).cause = reason;
        this.emit("error", err);
      }
    } catch (err: any) {
      this.emit("error", err);
    }
  }

  // ── Internal: called by native event router ──────────────────────────────

  /** @internal */
  _handleNativeEvent(event: NativeChildProcessEvent): void {
    switch (event.type) {
      case "spawn":
        this.emit("spawn");
        break;

      case "stdout":
        this.stdout?._pushBase64Chunk(event.data ?? "");
        break;

      case "stderr":
        this.stderr?._pushBase64Chunk(event.data ?? "");
        break;

      case "stdoutEnd":
        this.stdout?._end();
        this._maybeClose();
        break;

      case "stderrEnd":
        this.stderr?._end();
        this._maybeClose();
        break;

      case "exit":
        this._exited = true;
        this.exitCode = event.exitCode ?? null;
        this.signalCode = event.signal ?? null;
        this.emit("exit", this.exitCode, this.signalCode);
        this._maybeClose();
        break;

      case "error": {
        const err = new Error(event.message ?? "Unknown child process error");
        this.emit("error", err);
        this._maybeClose();
        break;
      }
    }
  }

  private _maybeClose(): void {
    this._closesGot++;
    if (this._closesGot < this._closesNeeded) return;
    if (this._closed) return;
    this._closed = true;

    if (this._timeoutHandle) {
      clearTimeout(this._timeoutHandle);
      this._timeoutHandle = null;
    }

    NativeModule.cleanup(this._id);
    unregisterChildProcess(this._id);

    this.emit("close", this.exitCode, this.signalCode);
  }
}
