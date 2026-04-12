/**
 * ChildProcess class backed by the native Expo module.
 */

import type { ChildProcess as NodeChildProcess } from "child_process";
import type { Readable, Writable } from "stream";

import { ChildReadable } from "./ChildReadable";
import { ChildWritable } from "./ChildWritable";
import { nativeModule, type ChildProcessNativeEvent } from "./native";
import { NodeEventEmitter } from "./NodeEventEmitter";

const childProcessRegistry = new Map<string, ChildProcess>();

nativeModule.addListener("onChildProcessEvent", (event) => {
  if (!isChildProcessNativeEvent(event)) return;
  const child = childProcessRegistry.get(event.id);
  if (!child) return;
  child._handleNativeEvent(event);
});

export class ChildProcess extends NodeEventEmitter implements NodeChildProcess {
  stdin: Writable | null = null;
  stdout: Readable | null = null;
  stderr: Readable | null = null;
  readonly stdio: NodeChildProcess["stdio"] = [null, null, null, undefined, undefined];
  readonly channel: NodeChildProcess["channel"] = undefined;
  pid: number | undefined = undefined;
  readonly connected: boolean = false;
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
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
      const didKill = nativeModule.kill(this._id, signalName);
      if (didKill) this.killed = true;
      return didKill;
    } catch {
      return false;
    }
  }

  [Symbol.dispose](): void {
    this.kill("SIGTERM");
  }

  send: NodeChildProcess["send"] = (() => {
    throw new Error("child_process.ChildProcess.send() is not implemented");
  }) as NodeChildProcess["send"];

  disconnect(): void {
    throw new Error("child_process.ChildProcess.disconnect() is not implemented");
  }

  ref(): this {
    // no-op in React Native context
    return this;
  }

  unref(): this {
    // no-op in React Native context
    return this;
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
        nativeModule.writeToStdin.bind(nativeModule),
        nativeModule.closeStdin.bind(nativeModule),
        (err: Error) => this.emit("error", err),
      ) as unknown as Writable;
    }

    if (stdoutMode === "pipe") {
      this.stdout = new ChildReadable() as unknown as Readable;
      this._closesNeeded++;
    }

    if (stderrMode === "pipe") {
      this.stderr = new ChildReadable() as unknown as Readable;
      this._closesNeeded++;
    }

    const stdio = this.stdio as [
      Writable | null,
      Readable | null,
      Readable | null,
      Readable | Writable | null | undefined,
      Readable | Writable | null | undefined,
    ];
    stdio[0] = this.stdin;
    stdio[1] = this.stdout;
    stdio[2] = this.stderr;

    childProcessRegistry.set(id, this);
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
  _handleNativeEvent(event: ChildProcessNativeEvent): void {
    switch (event.type) {
      case "spawn":
        this.emit("spawn");
        break;

      case "stdout":
        (this.stdout as ChildReadable | null)?._pushBase64Chunk(event.data ?? "");
        break;

      case "stderr":
        (this.stderr as ChildReadable | null)?._pushBase64Chunk(event.data ?? "");
        break;

      case "stdoutEnd":
        (this.stdout as ChildReadable | null)?._end();
        this._maybeClose();
        break;

      case "stderrEnd":
        (this.stderr as ChildReadable | null)?._end();
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

    nativeModule.cleanup(this._id);
    childProcessRegistry.delete(this._id);

    this.emit("close", this.exitCode, this.signalCode);
  }
}

function isChildProcessNativeEvent(
  value: ChildProcessNativeEvent,
): value is ChildProcessNativeEvent {
  if (!value || typeof value !== "object") return false;
  if (typeof value.id !== "string") return false;
  return (
    value.type === "spawn" ||
    value.type === "stdout" ||
    value.type === "stderr" ||
    value.type === "stdoutEnd" ||
    value.type === "stderrEnd" ||
    value.type === "exit" ||
    value.type === "error"
  );
}
