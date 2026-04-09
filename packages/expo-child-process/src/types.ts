/// <reference types="node" />

/**
 * Public child_process typings come directly from Node's declarations so this
 * package stays aligned with the real API surface.
 */

import type * as childProcess from "child_process";
import type { Readable, Writable } from "stream";

export type Serializable = childProcess.Serializable;
export type SendHandle = childProcess.SendHandle;

export type ChildProcess = childProcess.ChildProcess;
export type ChildProcessByStdio<
  I extends Writable | null,
  O extends Readable | null,
  E extends Readable | null,
> = childProcess.ChildProcessByStdio<I, O, E>;
export type ChildProcessWithoutNullStreams = childProcess.ChildProcessWithoutNullStreams;
export type PromiseWithChild<T> = childProcess.PromiseWithChild<T>;

export type MessageOptions = childProcess.MessageOptions;
export type IOType = childProcess.IOType;
export type StdioOptions = childProcess.StdioOptions;
export type SerializationType = childProcess.SerializationType;
export type MessagingOptions = childProcess.MessagingOptions;
export type ProcessEnvOptions = childProcess.ProcessEnvOptions;
export type CommonOptions = childProcess.CommonOptions;
export type CommonSpawnOptions = childProcess.CommonSpawnOptions;
export type SpawnOptions = childProcess.SpawnOptions;
export type SpawnOptionsWithoutStdio = childProcess.SpawnOptionsWithoutStdio;
export type StdioNull = childProcess.StdioNull;
export type StdioPipeNamed = childProcess.StdioPipeNamed;
export type StdioPipe = childProcess.StdioPipe;
export type SpawnOptionsWithStdioTuple<
  Stdin extends childProcess.StdioNull | childProcess.StdioPipe,
  Stdout extends childProcess.StdioNull | childProcess.StdioPipe,
  Stderr extends childProcess.StdioNull | childProcess.StdioPipe,
> = childProcess.SpawnOptionsWithStdioTuple<Stdin, Stdout, Stderr>;

export type ExecOptions = childProcess.ExecOptions;
export type ExecOptionsWithStringEncoding = childProcess.ExecOptionsWithStringEncoding;
export type ExecOptionsWithBufferEncoding = childProcess.ExecOptionsWithBufferEncoding;
export type ExecException = childProcess.ExecException;

export type ExecFileOptions = childProcess.ExecFileOptions;
export type ExecFileOptionsWithStringEncoding = childProcess.ExecFileOptionsWithStringEncoding;
export type ExecFileOptionsWithBufferEncoding = childProcess.ExecFileOptionsWithBufferEncoding;
export type ExecFileException = childProcess.ExecFileException;

export type ForkOptions = childProcess.ForkOptions;

export type SpawnSyncOptions = childProcess.SpawnSyncOptions;
export type SpawnSyncOptionsWithStringEncoding = childProcess.SpawnSyncOptionsWithStringEncoding;
export type SpawnSyncOptionsWithBufferEncoding = childProcess.SpawnSyncOptionsWithBufferEncoding;
export type SpawnSyncReturns<T> = childProcess.SpawnSyncReturns<T>;

export type CommonExecOptions = childProcess.CommonExecOptions;
export type ExecSyncOptions = childProcess.ExecSyncOptions;
export type ExecSyncOptionsWithStringEncoding = childProcess.ExecSyncOptionsWithStringEncoding;
export type ExecSyncOptionsWithBufferEncoding = childProcess.ExecSyncOptionsWithBufferEncoding;

export type ExecFileSyncOptions = childProcess.ExecFileSyncOptions;
export type ExecFileSyncOptionsWithStringEncoding =
  childProcess.ExecFileSyncOptionsWithStringEncoding;
export type ExecFileSyncOptionsWithBufferEncoding =
  childProcess.ExecFileSyncOptionsWithBufferEncoding;

export interface NativeChildProcessEvent {
  id: string;
  type: "stdout" | "stderr" | "stdoutEnd" | "stderrEnd" | "exit" | "error" | "spawn";
  data?: string;
  exitCode?: number | null;
  signal?: string | null;
  message?: string;
}

export interface NativeSpawnConfig {
  file: string;
  args: string[];
  cwd: string | null;
  env: Record<string, string> | null;
  stdio: string[];
  shell: boolean | string;
  detached: boolean;
  uid: number | null;
  gid: number | null;
  killSignal: string;
  timeoutMs: number | null;
}

export interface NativeSpawnResult {
  id: string;
  pid: number;
  spawnfile: string;
  spawnargs: string[];
}

export interface NativeSpawnSyncResult {
  pid: number;
  status: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  error?: string;
}

export interface NativeSpawnSyncConfig extends NativeSpawnConfig {
  inputBase64: string | null;
}
