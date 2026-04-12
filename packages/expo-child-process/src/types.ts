/// <reference types="node" />

/**
 * Public typings come directly from Node's child_process declarations.
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

/**
 * Strip the __promisify__ type from a function
 */
export type Unpromisified<T extends (...args: Array<any>) => any> = (
  ...args: Parameters<T>
) => ReturnType<T>;
