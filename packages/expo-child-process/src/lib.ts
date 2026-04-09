/**
 * expo-child-process — stub entrypoint for non-macOS platforms.
 *
 * The public types intentionally mirror Node's child_process declarations even
 * though the runtime implementation is only available on macOS.
 */

import type { Readable, Writable } from "stream";

import { Buffer } from "buffer";

import type {
  ChildProcess as NodeChildProcess,
  ExecException,
  ExecFileException,
  ExecFileOptions,
  ExecFileOptionsWithBufferEncoding,
  ExecFileOptionsWithStringEncoding,
  ExecOptions,
  ExecOptionsWithBufferEncoding,
  ExecOptionsWithStringEncoding,
  ExecSyncOptions,
  ExecFileSyncOptions,
  ForkOptions,
  MessageOptions,
  SendHandle,
  Serializable,
  SpawnOptions,
  SpawnOptionsWithoutStdio,
  SpawnSyncOptions,
  SpawnSyncReturns,
} from "./types";

import { NodeEventEmitter } from "./NodeEventEmitter";

function notSupported(name: string): never {
  throw new Error(`child_process.${name}() is only supported on macOS`);
}

export class ChildReadable extends NodeEventEmitter {
  readable: boolean = false;
  readableEncoding: string | null = null;
  readableEnded: boolean = true;
  readableFlowing: boolean | null = null;
  destroyed: boolean = true;

  setEncoding(_encoding: BufferEncoding): this {
    return notSupported("Readable.setEncoding");
  }

  read(_size?: number): string | Buffer | null {
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
  writable: boolean = false;
  writableEnded: boolean = true;
  writableFinished: boolean = true;
  destroyed: boolean = true;

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
  readonly connected: boolean = false;
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  spawnargs: string[] = [];
  spawnfile: string = "";
  killed: boolean = false;

  _id: string = "";

  kill(_signal?: string | number): boolean {
    return notSupported("ChildProcess.kill");
  }

  send(message: Serializable, callback?: (error: Error | null) => void): boolean;
  send(
    message: Serializable,
    sendHandle?: SendHandle,
    callback?: (error: Error | null) => void,
  ): boolean;
  send(
    message: Serializable,
    sendHandle?: SendHandle,
    options?: MessageOptions,
    callback?: (error: Error | null) => void,
  ): boolean;
  send(
    _message: Serializable,
    _sendHandle?: SendHandle | ((error: Error | null) => void),
    _options?: MessageOptions | ((error: Error | null) => void),
    _callback?: (error: Error | null) => void,
  ): boolean {
    return notSupported("ChildProcess.send");
  }

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

export function spawn(
  command: string,
  args?: readonly string[] | SpawnOptionsWithoutStdio,
): ChildProcess;
export function spawn(
  command: string,
  args?: readonly string[] | SpawnOptionsWithoutStdio,
  options?: SpawnOptions,
): ChildProcess;
export function spawn(_command: string, _args?: unknown, _options?: unknown): ChildProcess {
  return notSupported("spawn");
}

export function exec(
  command: string,
  callback?: (error: ExecException | null, stdout: string, stderr: string) => void,
): ChildProcess;
export function exec(
  command: string,
  options: ExecOptionsWithBufferEncoding,
  callback?: (error: ExecException | null, stdout: Buffer, stderr: Buffer) => void,
): ChildProcess;
export function exec(
  command: string,
  options: ExecOptionsWithStringEncoding,
  callback?: (error: ExecException | null, stdout: string, stderr: string) => void,
): ChildProcess;
export function exec(
  command: string,
  options: ExecOptions | undefined | null,
  callback?: (
    error: ExecException | null,
    stdout: string | Buffer,
    stderr: string | Buffer,
  ) => void,
): ChildProcess;
export function exec(_command: string, _options?: unknown, _callback?: unknown): ChildProcess {
  return notSupported("exec");
}

export function execFile(
  file: string,
  callback?: (error: ExecFileException | null, stdout: string, stderr: string) => void,
): ChildProcess;
export function execFile(
  file: string,
  args: readonly string[] | undefined | null,
  callback?: (error: ExecFileException | null, stdout: string, stderr: string) => void,
): ChildProcess;
export function execFile(
  file: string,
  options: ExecFileOptionsWithBufferEncoding,
  callback?: (error: ExecFileException | null, stdout: Buffer, stderr: Buffer) => void,
): ChildProcess;
export function execFile(
  file: string,
  args: readonly string[] | undefined | null,
  options: ExecFileOptionsWithBufferEncoding,
  callback?: (error: ExecFileException | null, stdout: Buffer, stderr: Buffer) => void,
): ChildProcess;
export function execFile(
  file: string,
  options: ExecFileOptionsWithStringEncoding,
  callback?: (error: ExecFileException | null, stdout: string, stderr: string) => void,
): ChildProcess;
export function execFile(
  file: string,
  args: readonly string[] | undefined | null,
  options: ExecFileOptionsWithStringEncoding,
  callback?: (error: ExecFileException | null, stdout: string, stderr: string) => void,
): ChildProcess;
export function execFile(
  file: string,
  options: ExecFileOptions | undefined | null,
  callback?:
    | ((error: ExecFileException | null, stdout: string | Buffer, stderr: string | Buffer) => void)
    | null,
): ChildProcess;
export function execFile(
  file: string,
  args: readonly string[] | undefined | null,
  options: ExecFileOptions | undefined | null,
  callback?:
    | ((error: ExecFileException | null, stdout: string | Buffer, stderr: string | Buffer) => void)
    | null,
): ChildProcess;
export function execFile(
  _file: string,
  _args?: unknown,
  _options?: unknown,
  _callback?: unknown,
): ChildProcess {
  return notSupported("execFile");
}

export function fork(
  modulePath: string,
  args?: readonly string[] | ForkOptions,
  options?: ForkOptions,
): ChildProcess {
  return notSupported("fork");
}

export function spawnSync(command: string): SpawnSyncReturns<Buffer>;
export function spawnSync(command: string, args: readonly string[]): SpawnSyncReturns<Buffer>;
export function spawnSync(
  command: string,
  args: readonly string[],
  options: SpawnSyncOptions & { encoding: BufferEncoding },
): SpawnSyncReturns<string>;
export function spawnSync(
  command: string,
  options: SpawnSyncOptions & { encoding: BufferEncoding },
): SpawnSyncReturns<string>;
export function spawnSync(
  command: string,
  args?: readonly string[] | SpawnSyncOptions,
  options?: SpawnSyncOptions,
): SpawnSyncReturns<string | Buffer>;
export function spawnSync(
  _command: string,
  _args?: unknown,
  _options?: unknown,
): SpawnSyncReturns<string | Buffer> {
  return notSupported("spawnSync");
}

export function execSync(command: string): Buffer;
export function execSync(
  command: string,
  options: ExecSyncOptions & { encoding: "buffer" | null },
): Buffer;
export function execSync(
  command: string,
  options: ExecSyncOptions & { encoding: BufferEncoding },
): string;
export function execSync(command: string, options?: ExecSyncOptions): string | Buffer;
export function execSync(_command: string, _options?: unknown): string | Buffer {
  return notSupported("execSync");
}

export function execFileSync(file: string): Buffer;
export function execFileSync(file: string, args: readonly string[]): Buffer;
export function execFileSync(
  file: string,
  options: ExecFileSyncOptions & { encoding: "buffer" | null },
): Buffer;
export function execFileSync(
  file: string,
  options: ExecFileSyncOptions & { encoding: BufferEncoding },
): string;
export function execFileSync(
  file: string,
  args: readonly string[],
  options: ExecFileSyncOptions & { encoding: "buffer" | null },
): Buffer;
export function execFileSync(
  file: string,
  args: readonly string[],
  options: ExecFileSyncOptions & { encoding: BufferEncoding },
): string;
export function execFileSync(
  file: string,
  args?: readonly string[] | ExecFileSyncOptions,
  options?: ExecFileSyncOptions,
): string | Buffer;
export function execFileSync(_file: string, _args?: unknown, _options?: unknown): string | Buffer {
  return notSupported("execFileSync");
}

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
