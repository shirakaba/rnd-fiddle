/**
 * Types for expo-child-process, adhering 1:1 to the Node.js child_process
 * TypeScript typings from @types/node/child_process.d.ts.
 *
 * Commented-out sections require node:net / node:dgram / full node:stream
 * which are out of scope for now.
 */

import type { ChildProcess } from "./ChildProcess";
import type { ChildReadable } from "./ChildReadable";
import type { ChildWritable } from "./ChildWritable";

// ── Serialization ──────────────────────────────────────────────────────────

export type Serializable = string | object | number | boolean | bigint;

// SendHandle requires node:net / node:dgram — commented out for now.
// export type SendHandle = net.Socket | net.Server | dgram.Socket | undefined;

// ── ChildProcess variant interfaces ────────────────────────────────────────

export interface ChildProcessWithoutNullStreams extends ChildProcess {
  stdin: ChildWritable;
  stdout: ChildReadable;
  stderr: ChildReadable;
  readonly stdio: [
    ChildWritable,
    ChildReadable,
    ChildReadable,
    ChildReadable | ChildWritable | null | undefined,
    ChildReadable | ChildWritable | null | undefined,
  ];
}

export interface ChildProcessByStdio<
  I extends null | ChildWritable,
  O extends null | ChildReadable,
  E extends null | ChildReadable,
> extends ChildProcess {
  stdin: I;
  stdout: O;
  stderr: E;
  readonly stdio: [
    I,
    O,
    E,
    ChildReadable | ChildWritable | null | undefined,
    ChildReadable | ChildWritable | null | undefined,
  ];
}

// ── Options ────────────────────────────────────────────────────────────────

export interface MessageOptions {
  keepOpen?: boolean | undefined;
}

export type IOType = "overlapped" | "pipe" | "ignore" | "inherit";

export type StdioOptions = IOType | Array<IOType | "ipc" | number | null | undefined>;

export type SerializationType = "json" | "advanced";

export interface MessagingOptions {
  serialization?: SerializationType | undefined;
  killSignal?: string | number | undefined;
  timeout?: number | undefined;
  signal?: AbortSignal | undefined;
}

export interface ProcessEnvOptions {
  uid?: number | undefined;
  gid?: number | undefined;
  cwd?: string | undefined;
  env?: Record<string, string | undefined> | undefined;
}

export interface CommonOptions extends ProcessEnvOptions {
  windowsHide?: boolean | undefined;
  timeout?: number | undefined;
}

export interface CommonSpawnOptions extends CommonOptions, MessagingOptions {
  argv0?: string | undefined;
  stdio?: StdioOptions | undefined;
  shell?: boolean | string | undefined;
  windowsVerbatimArguments?: boolean | undefined;
}

export interface SpawnOptions extends CommonSpawnOptions {
  detached?: boolean | undefined;
}

export interface SpawnOptionsWithoutStdio extends SpawnOptions {
  stdio?: StdioPipeNamed | StdioPipe[] | undefined;
}

export type StdioNull = "inherit" | "ignore";
export type StdioPipeNamed = "pipe" | "overlapped";
export type StdioPipe = undefined | null | StdioPipeNamed;

export interface SpawnOptionsWithStdioTuple<
  Stdin extends StdioNull | StdioPipe,
  Stdout extends StdioNull | StdioPipe,
  Stderr extends StdioNull | StdioPipe,
> extends SpawnOptions {
  stdio: [Stdin, Stdout, Stderr];
}

// ── Exec options ───────────────────────────────────────────────────────────

export interface ExecOptions extends CommonOptions {
  shell?: string | undefined;
  signal?: AbortSignal | undefined;
  maxBuffer?: number | undefined;
  killSignal?: string | number | undefined;
  encoding?: string | null | undefined;
}

export interface ExecOptionsWithStringEncoding extends ExecOptions {
  encoding?: BufferEncoding | undefined;
}

export interface ExecOptionsWithBufferEncoding extends ExecOptions {
  encoding: "buffer" | null;
}

export interface ExecException extends Error {
  cmd?: string;
  killed?: boolean;
  code?: number;
  signal?: string;
  stdout?: string;
  stderr?: string;
}

// ── ExecFile options ───────────────────────────────────────────────────────

export interface ExecFileOptions extends CommonOptions {
  maxBuffer?: number | undefined;
  killSignal?: string | number | undefined;
  windowsVerbatimArguments?: boolean | undefined;
  shell?: boolean | string | undefined;
  signal?: AbortSignal | undefined;
  encoding?: string | null | undefined;
}

export interface ExecFileOptionsWithStringEncoding extends ExecFileOptions {
  encoding?: BufferEncoding | undefined;
}

export interface ExecFileOptionsWithBufferEncoding extends ExecFileOptions {
  encoding: "buffer" | null;
}

export type ExecFileException = ExecException & {
  code?: string | number | null;
};

// ── Fork options ───────────────────────────────────────────────────────────

export interface ForkOptions extends ProcessEnvOptions, MessagingOptions {
  execPath?: string | undefined;
  execArgv?: string[] | undefined;
  silent?: boolean | undefined;
  stdio?: StdioOptions | undefined;
  detached?: boolean | undefined;
  windowsVerbatimArguments?: boolean | undefined;
}

// ── SpawnSync options & result ─────────────────────────────────────────────

export interface SpawnSyncOptions extends CommonSpawnOptions {
  input?: string | Uint8Array | undefined;
  maxBuffer?: number | undefined;
  encoding?: BufferEncoding | "buffer" | null | undefined;
}

export interface SpawnSyncOptionsWithStringEncoding extends SpawnSyncOptions {
  encoding: BufferEncoding;
}

export interface SpawnSyncOptionsWithBufferEncoding extends SpawnSyncOptions {
  encoding?: "buffer" | null | undefined;
}

export interface SpawnSyncReturns<T> {
  pid: number;
  output: Array<T | null>;
  stdout: T;
  stderr: T;
  status: number | null;
  signal: string | null;
  error?: Error;
}

// ── ExecSync options ───────────────────────────────────────────────────────

export interface CommonExecOptions extends CommonOptions {
  input?: string | Uint8Array | undefined;
  stdio?: StdioOptions | undefined;
  killSignal?: string | number | undefined;
  maxBuffer?: number | undefined;
  encoding?: BufferEncoding | "buffer" | null | undefined;
}

export interface ExecSyncOptions extends CommonExecOptions {
  shell?: string | undefined;
}

export interface ExecSyncOptionsWithStringEncoding extends ExecSyncOptions {
  encoding: BufferEncoding;
}

export interface ExecSyncOptionsWithBufferEncoding extends ExecSyncOptions {
  encoding?: "buffer" | null | undefined;
}

// ── ExecFileSync options ───────────────────────────────────────────────────

export interface ExecFileSyncOptions extends CommonExecOptions {
  shell?: boolean | string | undefined;
}

export interface ExecFileSyncOptionsWithStringEncoding extends ExecFileSyncOptions {
  encoding: BufferEncoding;
}

export interface ExecFileSyncOptionsWithBufferEncoding extends ExecFileSyncOptions {
  encoding?: "buffer" | null | undefined;
}

// ── PromiseWithChild ───────────────────────────────────────────────────────

export interface PromiseWithChild<T> extends Promise<T> {
  child: ChildProcess;
}

// ── BufferEncoding (subset that we support) ────────────────────────────────

type BufferEncoding = "utf8" | "utf-8" | "ascii" | "latin1" | "hex" | "base64";

// ── Native module types ────────────────────────────────────────────────────

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

export interface NativeSpawnSyncConfig extends NativeSpawnConfig {
  inputBase64: string | null;
}
