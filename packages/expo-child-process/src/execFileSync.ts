/**
 * execFileSync(), following the Node.js source at
 * https://github.com/nodejs/node/blob/main/lib/child_process.js
 *
 * Like execFile, but synchronous. Throws on non-zero exit.
 */

import type { Buffer as NodeBuffer } from "buffer";

import { Buffer as RuntimeBuffer } from "react-native-buffer";

import type { ExecFileSyncOptions, SpawnSyncOptions } from "./types";

import { spawnSync } from "./spawnSync";

const execFileSyncImpl = (
  file: string,
  args?: readonly string[] | ExecFileSyncOptions,
  options?: ExecFileSyncOptions,
): string | NodeBuffer => {
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
    const stderr = RuntimeBuffer.isBuffer(ret.stderr) ? ret.stderr.toString("utf8") : ret.stderr;
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
};

export const execFileSync: typeof import("child_process").execFileSync =
  execFileSyncImpl as typeof import("child_process").execFileSync;
