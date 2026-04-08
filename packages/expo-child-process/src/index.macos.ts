/**
 * expo-child-process — macOS implementation.
 *
 * Re-exports the full child_process API surface, backed by the native
 * ExpoChildProcess Expo Module via Foundation.Process on macOS.
 */

export { ChildProcess } from "./ChildProcess";
export { ChildReadable } from "./ChildReadable";
export { ChildWritable } from "./ChildWritable";

export { spawn } from "./spawn";
export { exec } from "./exec";
export { execFile } from "./execFile";
export { fork } from "./fork";

export { spawnSync } from "./spawnSync";
export { execSync } from "./execSync";
export { execFileSync } from "./execFileSync";

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
