/**
 * expo-child-process — stub entrypoint for non-macOS platforms.
 *
 * All APIs throw with a clear error message. This ensures that importing the
 * module on unsupported platforms fails loudly at call sites rather than at
 * import time.
 */

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

  setEncoding(_encoding: string): this {
    return notSupported("Readable.setEncoding");
  }
  read(_size?: number): any {
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

  write(_chunk: any, _enc?: any, _cb?: any): boolean {
    return notSupported("Writable.write");
  }
  end(_chunk?: any, _enc?: any, _cb?: any): this {
    return notSupported("Writable.end");
  }
  destroy(_error?: Error): this {
    return notSupported("Writable.destroy");
  }
}

export class ChildProcess extends NodeEventEmitter {
  stdin: ChildWritable | null = null;
  stdout: ChildReadable | null = null;
  stderr: ChildReadable | null = null;
  readonly stdio: [null, null, null, null, null] = [null, null, null, null, null];
  pid: number | undefined = undefined;
  readonly connected: boolean = false;
  exitCode: number | null = null;
  signalCode: string | null = null;
  spawnargs: string[] = [];
  spawnfile: string = "";
  killed: boolean = false;

  _id: string = "";

  kill(_signal?: string | number): boolean {
    return notSupported("ChildProcess.kill");
  }
  disconnect(): void {
    notSupported("ChildProcess.disconnect");
  }
  ref(): void {
    notSupported("ChildProcess.ref");
  }
  unref(): void {
    notSupported("ChildProcess.unref");
  }

  _handleNativeEvent(_event: any): void {}
  _spawn(..._args: any[]): void {
    notSupported("ChildProcess._spawn");
  }
  _setupTimeout(..._args: any[]): void {}
  _setupAbortSignal(..._args: any[]): void {}
}

export function spawn(_command: string, _args?: any, _options?: any): ChildProcess {
  return notSupported("spawn");
}

export function exec(_command: string, _options?: any, _callback?: any): ChildProcess {
  return notSupported("exec");
}

export function execFile(
  _file: string,
  _args?: any,
  _options?: any,
  _callback?: any,
): ChildProcess {
  return notSupported("execFile");
}

export function fork(_modulePath: string, _args?: any, _options?: any): ChildProcess {
  return notSupported("fork");
}

export function spawnSync(_command: string, _args?: any, _options?: any): any {
  return notSupported("spawnSync");
}

export function execSync(_command: string, _options?: any): any {
  return notSupported("execSync");
}

export function execFileSync(_file: string, _args?: any, _options?: any): any {
  return notSupported("execFileSync");
}

export type {
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
