/**
 * execSync(), following the Node.js source at
 * https://github.com/nodejs/node/blob/main/lib/child_process.js
 *
 * Runs a command in a shell synchronously. Throws on non-zero exit code.
 */

import type { Buffer as NodeBuffer } from "buffer";

import { Buffer as RuntimeBuffer } from "react-native-buffer";

import type { ExecSyncOptions } from "./types";

import { spawnSync } from "./spawnSync";

const execSyncImpl = (command: string, options?: ExecSyncOptions): string | NodeBuffer => {
  const opts = {
    ...options,
    shell: typeof options?.shell === "string" ? options.shell : true,
  };

  const ret = spawnSync(command, [], opts as any);

  if (ret.error) {
    throw Object.assign(ret.error, ret);
  }

  if (ret.status !== 0 || ret.signal) {
    const stderr = RuntimeBuffer.isBuffer(ret.stderr) ? ret.stderr.toString("utf8") : ret.stderr;
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
};

export const execSync: typeof import("child_process").execSync =
  execSyncImpl as typeof import("child_process").execSync;
