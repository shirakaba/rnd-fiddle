export type SerializableValue =
  | string
  | number
  | boolean
  | null
  | SerializableValue[]
  | { [key: string]: SerializableValue };

export type StdioValue = "pipe" | "ignore" | "inherit";

export interface CommonSpawnOptions {
  cwd?: string;
  detached?: boolean;
  env?: Record<string, string>;
  gid?: number;
  killSignal?: string | number;
  shell?: boolean | string;
  signal?: AbortSignal;
  stdio?: StdioValue | StdioValue[];
  timeout?: number;
  uid?: number;
  windowsHide?: boolean;
}

export interface SpawnOptions extends CommonSpawnOptions {}

export interface ExecOptions extends CommonSpawnOptions {
  encoding?: "utf8" | "buffer";
  killSignal?: string | number;
  maxBuffer?: number;
}

export interface ExecFileOptions extends ExecOptions {}

export interface ForkOptions extends CommonSpawnOptions {
  execArgv?: string[];
  execPath?: string;
  serialization?: "json" | "advanced";
}

export interface SpawnSyncOptions extends CommonSpawnOptions {
  encoding?: "utf8" | "buffer";
  input?: string | Uint8Array;
  killSignal?: string | number;
  maxBuffer?: number;
}

export interface SpawnSyncResult {
  output: [null, string | Uint8Array, string | Uint8Array];
  pid: number | null;
  signal: string | null;
  status: number | null;
  stderr: string | Uint8Array;
  stdout: string | Uint8Array;
}

export type ExecCallback = (
  error: Error | null,
  stdout: string | Uint8Array,
  stderr: string | Uint8Array,
) => void;

export interface EventSubscriptionLike {
  remove(): void;
}

export interface ReadableLike {
  destroy(): void;
  off(event: string, listener: (...args: any[]) => void): this;
  on(event: "data", listener: (chunk: string | Uint8Array) => void): this;
  on(event: "close" | "end", listener: () => void): this;
  on(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  pause(): this;
  pipe(destination: { write(chunk: string | Uint8Array): unknown }): unknown;
  resume(): this;
  setEncoding(encoding: "utf8"): this;
}

export interface WritableLike {
  destroy(error?: Error): void;
  end(chunk?: string | Uint8Array, encoding?: "utf8", callback?: () => void): this;
  write(chunk: string | Uint8Array, encoding?: "utf8", callback?: () => void): boolean;
}

export declare class ChildProcess {
  connected: boolean;
  exitCode: number | null;
  killed: boolean;
  pid: number | null;
  signalCode: string | null;
  spawnargs: string[];
  spawnfile: string;
  stderr: ReadableLike | null;
  stdin: WritableLike | null;
  stdout: ReadableLike | null;
  disconnect(): void;
  kill(signal?: string | number): boolean;
  off(event: string, listener: (...args: any[]) => void): this;
  on(event: "close", listener: (code: number | null, signal: string | null) => void): this;
  on(event: "error", listener: (error: Error) => void): this;
  on(event: "exit", listener: (code: number | null, signal: string | null) => void): this;
  on(event: "spawn", listener: () => void): this;
  on(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  ref(): this;
  removeAllListeners(event?: string): this;
  send(message: SerializableValue): never;
  unref(): this;
}

export declare function getMessage(): string;
export declare function getTestScriptPath(): string;
export declare function spawn(file: string, args?: string[], options?: SpawnOptions): ChildProcess;
export declare function exec(
  command: string,
  options?: ExecOptions | ExecCallback,
  callback?: ExecCallback,
): ChildProcess;
export declare function execFile(
  file: string,
  args?: string[] | ExecFileOptions | ExecCallback,
  options?: ExecFileOptions | ExecCallback,
  callback?: ExecCallback,
): ChildProcess;
export declare function fork(
  modulePath: string,
  args?: string[] | ForkOptions,
  options?: ForkOptions,
): ChildProcess;
export declare function spawnSync(
  file: string,
  args?: string[] | SpawnSyncOptions,
  options?: SpawnSyncOptions,
): SpawnSyncResult;
export declare function execSync(command: string, options?: ExecOptions): string | Uint8Array;
export declare function execFileSync(
  file: string,
  args?: string[] | ExecFileOptions,
  options?: ExecFileOptions,
): string | Uint8Array;

declare const ExpoChildProcess: {
  ChildProcess: typeof ChildProcess;
  exec: typeof exec;
  execFile: typeof execFile;
  execFileSync: typeof execFileSync;
  execSync: typeof execSync;
  fork: typeof fork;
  getMessage: typeof getMessage;
  getTestScriptPath: typeof getTestScriptPath;
  spawn: typeof spawn;
  spawnSync: typeof spawnSync;
};

export default ExpoChildProcess;
