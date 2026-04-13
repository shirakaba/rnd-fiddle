// The re-exported EventEmitter/NativeModule type aliases in expo-modules-core
// use `typeof ExpoGlobal.EventEmitter<T>` instantiation expressions that tsgo
// cannot resolve, so we import the declare class directly from the source
// ts-declarations where the generic is defined correctly.
import type { EventEmitter } from "expo-modules-core/ts-declarations/EventEmitter";

import { requireNativeModule } from "expo-modules-core";

interface NativeSpawnConfig {
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

interface NativeSpawnResult {
  id: string;
  pid: number;
  spawnfile: string;
  spawnargs: string[];
}

interface NativeSpawnSyncConfig extends NativeSpawnConfig {
  inputBase64: string | null;
}

interface NativeSpawnSyncResult {
  pid: number;
  status: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  error?: string;
}

export interface ChildProcessNativeEvent {
  id: string;
  type: "spawn" | "stdout" | "stderr" | "stdoutEnd" | "stderrEnd" | "exit" | "error";
  data?: string;
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
  message?: string;
}

export type ExpoChildProcessEventsMap = {
  onChildProcessEvent: (event: ChildProcessNativeEvent) => void;
};

export interface ExpoChildProcessNativeModule extends EventEmitter<ExpoChildProcessEventsMap> {
  spawn(config: NativeSpawnConfig): NativeSpawnResult;
  kill(id: string, signal: string | null): boolean;
  writeToStdin(id: string, base64Data: string): boolean;
  closeStdin(id: string): boolean;
  cleanup(id: string): boolean;
  spawnSync(config: NativeSpawnSyncConfig): NativeSpawnSyncResult;
}

export const nativeModule = requireNativeModule<ExpoChildProcessNativeModule>("ExpoChildProcess");

export type { NativeSpawnConfig, NativeSpawnResult, NativeSpawnSyncConfig, NativeSpawnSyncResult };
