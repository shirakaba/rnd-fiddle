/**
 * execSync(), following the Node.js source at
 * https://github.com/nodejs/node/blob/main/lib/child_process.js
 *
 * Runs a command in a shell synchronously. Throws on non-zero exit code.
 */

import type { ExecSyncOptions } from "./types";

import { spawnSync } from "./spawnSync";

export function execSync(command: string): Uint8Array;
export function execSync(
  command: string,
  options: ExecSyncOptions & { encoding: "buffer" | null },
): Uint8Array;
export function execSync(
  command: string,
  options: ExecSyncOptions & { encoding: BufferEncoding },
): string;
export function execSync(command: string, options?: ExecSyncOptions): string | Uint8Array;
export function execSync(command: string, options?: ExecSyncOptions): string | Uint8Array {
  const opts = {
    ...options,
    shell: typeof options?.shell === "string" ? options.shell : true,
  };

  const ret = spawnSync(command, [], opts as any);

  if (ret.error) {
    throw Object.assign(ret.error, ret);
  }

  if (ret.status !== 0 || ret.signal) {
    const stderr =
      ret.stderr instanceof Uint8Array ? new TextDecoder().decode(ret.stderr) : ret.stderr;
    let msg = `Command failed: ${command}`;
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
