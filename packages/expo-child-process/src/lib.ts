/**
 * expo-child-process — stub entrypoint for non-macOS platforms.
 *
 * The public types intentionally mirror Node's child_process declarations even
 * though the runtime implementation is only available on macOS.
 */

import type { Buffer as NodeBuffer } from "buffer";
import type { ChildProcess as NodeChildProcess } from "child_process";
import type { Readable, Writable } from "stream";

import type {
  ExecFileOptions,
  ExecOptions,
  ExecSyncOptions,
  ExecFileSyncOptions,
  ForkOptions,
  SpawnOptions,
  SpawnOptionsWithoutStdio,
  SpawnSyncOptions,
} from "./types";

import { NodeEventEmitter } from "./NodeEventEmitter";

function notSupported(name: string): never {
  throw new Error(`child_process.${name}() is only supported on macOS`);
}

export class ChildReadable extends NodeEventEmitter {
  readable = false;
  readableEncoding: string | null = null;
  readableEnded = true;
  readableFlowing: boolean | null = null;
  destroyed = true;

  setEncoding(_encoding: BufferEncoding): this {
    return notSupported("Readable.setEncoding");
  }

  read(_size?: number): string | NodeBuffer | null {
    return notSupported("Readable.read");
  }

  pause(): this {
    return notSupported("Readable.pause");
  }

  resume(): this {
    return notSupported("Readable.resume");
  }

  pipe<T>(_dest: T): T {
    return notSupported("Readable.pipe");
  }

  destroy(_error?: Error): this {
    return notSupported("Readable.destroy");
  }

  _pushBase64Chunk(_b64: string): void {
    notSupported("Readable._pushBase64Chunk");
  }

  _end(): void {
    notSupported("Readable._end");
  }
}

export class ChildWritable extends NodeEventEmitter {
  writable = false;
  writableEnded = true;
  writableFinished = true;
  destroyed = true;

  write(_chunk: string | Uint8Array, _enc?: unknown, _cb?: unknown): boolean {
    return notSupported("Writable.write");
  }

  end(_chunk?: unknown, _enc?: unknown, _cb?: unknown): this {
    return notSupported("Writable.end");
  }

  destroy(_error?: Error): this {
    return notSupported("Writable.destroy");
  }
}

export class ChildProcess extends NodeEventEmitter implements NodeChildProcess {
  stdin: Writable | null = null;
  stdout: Readable | null = null;
  stderr: Readable | null = null;
  readonly stdio: NodeChildProcess["stdio"] = [null, null, null, undefined, undefined];
  readonly channel: NodeChildProcess["channel"] = undefined;
  pid: number | undefined = undefined;
  readonly connected = false;
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  spawnargs: string[] = [];
  spawnfile = "";
  killed = false;
  _id = "";

  kill(_signal?: string | number): boolean {
    return notSupported("ChildProcess.kill");
  }

  send: NodeChildProcess["send"] = (() => {
    throw new Error("child_process.ChildProcess.send() is not implemented");
  }) as NodeChildProcess["send"];

  disconnect(): void {
    notSupported("ChildProcess.disconnect");
  }

  ref(): this {
    return notSupported("ChildProcess.ref");
  }

  unref(): this {
    return notSupported("ChildProcess.unref");
  }

  [Symbol.dispose](): void {
    notSupported("ChildProcess.[Symbol.dispose]");
  }

  _handleNativeEvent(_event: unknown): void {}
  _spawn(..._args: unknown[]): void {
    notSupported("ChildProcess._spawn");
  }
  _setupTimeout(..._args: unknown[]): void {}
  _setupAbortSignal(..._args: unknown[]): void {}
}

const spawnImpl = (
  _command: string,
  _args?: readonly string[] | SpawnOptionsWithoutStdio,
  _options?: SpawnOptions,
): ChildProcess => notSupported("spawn");

export const spawn: typeof import("child_process").spawn =
  spawnImpl as unknown as typeof import("child_process").spawn;

const execImpl = (
  _command: string,
  _optionsOrCallback?: ExecOptions | ((...args: any[]) => void) | null,
  _callback?: (...args: any[]) => void,
): ChildProcess => notSupported("exec");

export const exec = Object.assign(execImpl as unknown as typeof import("child_process").exec, {
  __promisify__: (() => {
    return notSupported("exec");
  }) as typeof import("child_process").exec.__promisify__,
});

const execFileImpl = (
  _file: string,
  _argsOrOptionsOrCallback?:
    | readonly string[]
    | ExecFileOptions
    | ((...args: any[]) => void)
    | null,
  _optionsOrCallback?: ExecFileOptions | ((...args: any[]) => void) | null,
  _callback?: (...args: any[]) => void,
): ChildProcess => notSupported("execFile");

export const execFile = Object.assign(
  execFileImpl as unknown as typeof import("child_process").execFile,
  {
    __promisify__: (() => {
      return notSupported("execFile");
    }) as typeof import("child_process").execFile.__promisify__,
  },
);

const forkImpl = (
  _modulePath: string,
  _args?: readonly string[] | ForkOptions,
  _options?: ForkOptions,
): ChildProcess => notSupported("fork");

export const fork: typeof import("child_process").fork =
  forkImpl as unknown as typeof import("child_process").fork;

const spawnSyncImpl = (
  _command: string,
  _args?: readonly string[] | SpawnSyncOptions,
  _options?: SpawnSyncOptions,
): import("child_process").SpawnSyncReturns<string | NodeBuffer> => notSupported("spawnSync");

export const spawnSync: typeof import("child_process").spawnSync =
  spawnSyncImpl as unknown as typeof import("child_process").spawnSync;

const execSyncImpl = (_command: string, _options?: ExecSyncOptions): string | NodeBuffer =>
  notSupported("execSync");

export const execSync: typeof import("child_process").execSync =
  execSyncImpl as unknown as typeof import("child_process").execSync;

const execFileSyncImpl = (
  _file: string,
  _args?: readonly string[] | ExecFileSyncOptions,
  _options?: ExecFileSyncOptions,
): string | NodeBuffer => notSupported("execFileSync");

export const execFileSync: typeof import("child_process").execFileSync =
  execFileSyncImpl as unknown as typeof import("child_process").execFileSync;

export type {
  ChildProcess as NodeChildProcess,
  ChildProcessByStdio,
  ChildProcessWithoutNullStreams,
  CommonExecOptions,
  CommonOptions,
  CommonSpawnOptions,
  ExecException,
  ExecFileException,
  ExecFileOptions,
  ExecFileOptionsWithBufferEncoding,
  ExecFileOptionsWithStringEncoding,
  ExecFileSyncOptions,
  ExecFileSyncOptionsWithBufferEncoding,
  ExecFileSyncOptionsWithStringEncoding,
  ExecOptions,
  ExecOptionsWithBufferEncoding,
  ExecOptionsWithStringEncoding,
  ExecSyncOptions,
  ExecSyncOptionsWithBufferEncoding,
  ExecSyncOptionsWithStringEncoding,
  ForkOptions,
  IOType,
  MessageOptions,
  MessagingOptions,
  ProcessEnvOptions,
  PromiseWithChild,
  SendHandle,
  Serializable,
  SerializationType,
  SpawnOptions,
  SpawnOptionsWithoutStdio,
  SpawnOptionsWithStdioTuple,
  SpawnSyncOptions,
  SpawnSyncOptionsWithBufferEncoding,
  SpawnSyncOptionsWithStringEncoding,
  SpawnSyncReturns,
  StdioNull,
  StdioOptions,
  StdioPipe,
  StdioPipeNamed,
} from "./types";
