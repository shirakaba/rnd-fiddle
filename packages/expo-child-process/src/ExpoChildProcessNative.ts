/**
 * Bridge to the native ExpoChildProcess module.
 *
 * Sets up a global event listener that routes native events to the correct
 * ChildProcess instance by id.
 */

import { EventEmitter, requireNativeModule } from "expo-modules-core";

import type { ChildProcess } from "./ChildProcess";
import type {
  NativeChildProcessEvent,
  NativeSpawnConfig,
  NativeSpawnResult,
  NativeSpawnSyncConfig,
  NativeSpawnSyncResult,
} from "./types";

interface ExpoChildProcessNativeModule {
  spawn(config: NativeSpawnConfig): NativeSpawnResult;
  kill(id: string, signal: string | null): boolean;
  writeToStdin(id: string, base64Data: string): boolean;
  closeStdin(id: string): boolean;
  cleanup(id: string): boolean;
  spawnSync(config: NativeSpawnSyncConfig): NativeSpawnSyncResult;
  addListener(eventName: string, listener: (event: any) => void): void;
  removeListeners(count: number): void;
}

export const NativeModule: ExpoChildProcessNativeModule = requireNativeModule("ExpoChildProcess");

// ── Global event routing ───────────────────────────────────────────────────

const childProcessRegistry = new Map<string, ChildProcess>();

const nativeEmitter = new EventEmitter(NativeModule as any);
nativeEmitter.addListener("onChildProcessEvent", (event: NativeChildProcessEvent) => {
  const child = childProcessRegistry.get(event.id);
  if (!child) return;
  child._handleNativeEvent(event);
});

export function registerChildProcess(id: string, child: ChildProcess): void {
  childProcessRegistry.set(id, child);
}

export function unregisterChildProcess(id: string): void {
  childProcessRegistry.delete(id);
}
