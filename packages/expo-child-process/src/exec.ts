/**
 * exec(), following the Node.js source at
 * https://github.com/nodejs/node/blob/main/lib/child_process.js
 *
 * exec() is implemented on top of execFile() with shell: true, exactly as
 * Node.js does.
 */

import type { ChildProcess } from "./ChildProcess";
import type { ExecException, ExecOptions, PromiseWithChild } from "./types";

import { execFile } from "./execFile";

type NodeBuffer = import("buffer").Buffer;

type ExecCallback = (
  error: ExecException | null,
  stdout: string | NodeBuffer,
  stderr: string | NodeBuffer,
) => void;

// ── normalizeExecArgs ──────────────────────────────────────────────────────

function normalizeExecArgs(
  command: string,
  options?: ExecOptions | ExecCallback | null,
  callback?: ExecCallback,
): { file: string; options: ExecOptions; callback: ExecCallback | undefined } {
  if (typeof command !== "string") {
    throw new TypeError('The "command" argument must be of type string');
  }

  if (typeof options === "function") {
    callback = options;
    options = undefined;
  }

  const opts: ExecOptions = { ...options };
  opts.shell = typeof opts.shell === "string" ? opts.shell : true;

  return { file: command, options: opts, callback };
}

const execImpl = (
  command: string,
  options: ExecOptions | undefined | null,
  callback?: (
    error: ExecException | null,
    stdout: string | NodeBuffer,
    stderr: string | NodeBuffer,
  ) => void,
): ChildProcess => {
  return execFile(command, options, callback as ExecCallback | undefined) as ChildProcess;
};

const execImplNormalized = (
  command: string,
  optionsOrCallback?: ExecOptions | ExecCallback | null,
  callback?: ExecCallback,
): ChildProcess => {
  const normalized = normalizeExecArgs(command, optionsOrCallback, callback);
  return execImpl(normalized.file, normalized.options, normalized.callback);
};

export const exec = Object.assign(
  execImplNormalized as unknown as typeof import("child_process").exec,
  {
    __promisify__: execPromisified as typeof import("child_process").exec.__promisify__,
  },
);

// ── exec.__promisify__ ─────────────────────────────────────────────────────

function execPromisified(command: string, options?: ExecOptions | null) {
  const promise = new Promise<{ stdout: string | NodeBuffer; stderr: string | NodeBuffer }>(
    (resolve, reject) => {
      const child = exec(command, options ?? {}, (err, stdout, stderr) => {
        if (err) {
          (err as any).stdout = stdout;
          (err as any).stderr = stderr;
          reject(err);
        } else {
          resolve({ stdout, stderr });
        }
      });
      (promise as any).child = child;
    },
  );
  return promise as PromiseWithChild<{ stdout: string | NodeBuffer; stderr: string | NodeBuffer }>;
}
