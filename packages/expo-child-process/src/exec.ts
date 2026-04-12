/**
 * exec(), following the Node.js source at
 * https://github.com/nodejs/node/blob/main/lib/child_process.js
 *
 * exec() is implemented on top of execFile() with shell: true, exactly as
 * Node.js does.
 */

import type { ExecOptions, Unpromisified } from "./types";

import { execFile, type ExecFileCallback } from "./execFile";

type ExecCallback = Parameters<Unpromisified<typeof import("node:child_process").exec>>[2];

// ── normalizeExecArgs ──────────────────────────────────────────────────────

const normalizeExecArgs: (
  ...args: Parameters<Unpromisified<typeof import("node:child_process").exec>>
) => { file: string; options: ExecOptions; callback: ExecCallback | undefined } = (
  command,
  options,
  callback,
) => {
  if (typeof command !== "string") {
    throw new TypeError('The "command" argument must be of type string');
  }

  if (typeof options === "function") {
    callback = options;
    options = undefined;
  }

  const opts: ExecOptions = { ...options };

  return { file: command, options: opts, callback };
};

const execImpl: Unpromisified<typeof import("node:child_process").exec> = (
  command,
  options,
  callback,
) => {
  return execFile(command, options, callback as ExecFileCallback);
};

const execImplNormalized: Unpromisified<typeof import("node:child_process").exec> = (
  command,
  optionsOrCallback,
  callback,
) => {
  const normalized = normalizeExecArgs(command, optionsOrCallback, callback);
  return execImpl(normalized.file, normalized.options, normalized.callback);
};

export const exec = Object.assign(execImplNormalized, {
  __promisify__: execPromisified,
});

// ── exec.__promisify__ ─────────────────────────────────────────────────────

function execPromisified(command: string, options?: ExecOptions | null) {
  const promise = new Promise<
    Omit<Awaited<typeof import("child_process").exec.__promisify__>, "child">
  >((resolve, reject) => {
    (promise as any).child = exec(command, options ?? {}, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        reject(err);
      } else {
        resolve({ stdout: stdout as string, stderr });
      }
    });
  });
  return promise as unknown as typeof import("child_process").exec.__promisify__;
}
