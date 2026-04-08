/**
 * execFileSync(), following the Node.js source at
 * https://github.com/nodejs/node/blob/main/lib/child_process.js
 *
 * Like execFile, but synchronous. Throws on non-zero exit.
 */

import type { ExecFileSyncOptions, SpawnSyncOptions } from "./types";

import { spawnSync } from "./spawnSync";

export function execFileSync(file: string): Uint8Array;
export function execFileSync(file: string, args: readonly string[]): Uint8Array;
export function execFileSync(
  file: string,
  options: ExecFileSyncOptions & { encoding: "buffer" | null },
): Uint8Array;
export function execFileSync(
  file: string,
  options: ExecFileSyncOptions & { encoding: BufferEncoding },
): string;
export function execFileSync(
  file: string,
  args: readonly string[],
  options: ExecFileSyncOptions & { encoding: "buffer" | null },
): Uint8Array;
export function execFileSync(
  file: string,
  args: readonly string[],
  options: ExecFileSyncOptions & { encoding: BufferEncoding },
): string;
export function execFileSync(
  file: string,
  args?: readonly string[] | ExecFileSyncOptions,
  options?: ExecFileSyncOptions,
): string | Uint8Array;
export function execFileSync(
  file: string,
  args?: readonly string[] | ExecFileSyncOptions,
  options?: ExecFileSyncOptions,
): string | Uint8Array {
  let normalizedArgs: readonly string[];
  let opts: ExecFileSyncOptions;

  if (Array.isArray(args)) {
    normalizedArgs = args;
    opts = options ?? {};
  } else if (args != null && typeof args === "object") {
    normalizedArgs = [];
    opts = args as ExecFileSyncOptions;
  } else {
    normalizedArgs = [];
    opts = {};
  }

  const ret = spawnSync(file, normalizedArgs, {
    ...opts,
    shell: opts.shell ?? false,
  } as SpawnSyncOptions);

  if (ret.error) {
    throw Object.assign(ret.error, ret);
  }

  if (ret.status !== 0 || ret.signal) {
    const stderr =
      ret.stderr instanceof Uint8Array ? new TextDecoder().decode(ret.stderr) : ret.stderr;
    const cmd = [file, ...normalizedArgs].join(" ");
    let msg = `Command failed: ${cmd}`;
    if (stderr && typeof stderr === "string" && stderr.length > 0) {
      msg += `\n${stderr}`;
    }
    throw Object.assign(new Error(msg), {
      status: ret.status,
      signal: ret.signal,
      stdout: ret.stdout,
      stderr: ret.stderr,
      output: ret.output,
      pid: ret.pid,
    });
  }

  return ret.stdout;
}

type BufferEncoding = "utf8" | "utf-8" | "ascii" | "latin1" | "hex" | "base64";
