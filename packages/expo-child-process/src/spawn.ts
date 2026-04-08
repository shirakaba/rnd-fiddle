/**
 * spawn() and normalizeSpawnArguments(), following the Node.js source at
 * https://github.com/nodejs/node/blob/main/lib/child_process.js
 */

import type {
  NativeSpawnConfig,
  SpawnOptions,
  SpawnOptionsWithoutStdio,
  StdioOptions,
} from "./types";

import { ChildProcess } from "./ChildProcess";
import { normalizeSignal } from "./constants";
import { NativeModule } from "./ExpoChildProcessNative";

// ── normalizeSpawnArguments ────────────────────────────────────────────────

export function normalizeSpawnArguments(
  file: string,
  args?: readonly string[] | SpawnOptions,
  options?: SpawnOptions,
): { file: string; args: string[]; options: SpawnOptions } {
  if (typeof file !== "string" || file.length === 0) {
    throw new TypeError('The "file" argument must be a non-empty string');
  }

  let normalizedArgs: string[];
  if (Array.isArray(args)) {
    normalizedArgs = args.slice();
  } else if (args == null) {
    normalizedArgs = [];
  } else if (typeof args === "object") {
    options = args as SpawnOptions;
    normalizedArgs = [];
  } else {
    throw new TypeError('The "args" argument must be of type Array');
  }

  if (options === undefined) {
    options = {};
  } else if (typeof options !== "object" || options === null) {
    throw new TypeError('The "options" argument must be of type Object');
  }

  options = { ...options };

  if (options.cwd != null && typeof options.cwd !== "string") {
    options.cwd = String(options.cwd);
  }

  if (options.shell) {
    const command = normalizedArgs.length > 0 ? `${file} ${normalizedArgs.join(" ")}` : file;

    if (typeof options.shell === "string") {
      file = options.shell;
    } else {
      file = "/bin/sh";
    }
    normalizedArgs = ["-c", command];
  }

  if (typeof options.argv0 === "string") {
    normalizedArgs.unshift(options.argv0);
  } else {
    normalizedArgs.unshift(file);
  }

  return { file, args: normalizedArgs, options };
}

// ── normalizeStdio ─────────────────────────────────────────────────────────

export function normalizeStdio(stdio: StdioOptions | undefined): string[] {
  if (Array.isArray(stdio)) {
    return [
      normalizeStdioValue(stdio[0]),
      normalizeStdioValue(stdio[1]),
      normalizeStdioValue(stdio[2]),
    ];
  }
  if (typeof stdio === "string") {
    const val = normalizeStdioValue(stdio);
    return [val, val, val];
  }
  return ["pipe", "pipe", "pipe"];
}

function normalizeStdioValue(value: any): string {
  if (value == null || value === "pipe" || value === "overlapped") return "pipe";
  if (value === "ignore") return "ignore";
  if (value === "inherit") return "inherit";
  return "pipe";
}

// ── buildNativeConfig ──────────────────────────────────────────────────────

export function buildNativeConfig(
  file: string,
  args: string[],
  options: SpawnOptions,
): NativeSpawnConfig {
  const env = options.env
    ? Object.fromEntries(
        Object.entries(options.env)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      )
    : null;

  return {
    file,
    args: args.slice(1), // args[0] is argv0, native side uses file + arguments
    cwd: (options.cwd as string) ?? null,
    env,
    stdio: normalizeStdio(options.stdio),
    shell: options.shell ?? false,
    detached: options.detached ?? false,
    uid: options.uid ?? null,
    gid: options.gid ?? null,
    killSignal: normalizeSignal(options.killSignal),
    timeoutMs: options.timeout ?? null,
  };
}

// ── spawn ──────────────────────────────────────────────────────────────────

export function spawn(
  command: string,
  args?: readonly string[] | SpawnOptionsWithoutStdio,
  options?: SpawnOptions,
): ChildProcess {
  const normalized = normalizeSpawnArguments(command, args, options);
  const opts = normalized.options;

  const killSignal = normalizeSignal(opts.killSignal);
  const stdioCfg = normalizeStdio(opts.stdio);

  const config: NativeSpawnConfig = {
    file: normalized.file,
    args: normalized.args.slice(1),
    cwd: (opts.cwd as string) ?? null,
    env: opts.env
      ? Object.fromEntries(
          Object.entries(opts.env)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)]),
        )
      : null,
    stdio: stdioCfg,
    shell: false, // already handled in normalizeSpawnArguments
    detached: opts.detached ?? false,
    uid: opts.uid ?? null,
    gid: opts.gid ?? null,
    killSignal,
    timeoutMs: null, // timeout handled in JS (matching Node.js)
  };

  const child = new ChildProcess();

  let info;
  try {
    info = NativeModule.spawn(config);
  } catch (err: any) {
    // Emit error async, matching Node.js behavior
    queueMicrotask(() => {
      child.emit("error", err instanceof Error ? err : new Error(String(err)));
      child.emit("close", null, null);
    });
    return child;
  }

  child._spawn(info.id, info.pid, info.spawnfile, info.spawnargs, stdioCfg);

  if (opts.timeout != null && opts.timeout > 0) {
    child._setupTimeout(opts.timeout, killSignal);
  }

  if (opts.signal) {
    child._setupAbortSignal(opts.signal, killSignal);
  }

  return child;
}
