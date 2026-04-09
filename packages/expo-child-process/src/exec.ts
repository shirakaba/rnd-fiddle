/**
 * exec(), following the Node.js source at
 * https://github.com/nodejs/node/blob/main/lib/child_process.js
 *
 * exec() is implemented on top of execFile() with shell: true, exactly as
 * Node.js does.
 */

import { Buffer } from "buffer";

import type { ChildProcess } from "./ChildProcess";
import type {
  ExecException,
  ExecOptions,
  ExecOptionsWithBufferEncoding,
  ExecOptionsWithStringEncoding,
  PromiseWithChild,
} from "./types";

import { execFile } from "./execFile";

type ExecCallback = (
  error: ExecException | null,
  stdout: string | Buffer,
  stderr: string | Buffer,
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

// ── exec ───────────────────────────────────────────────────────────────────

export function exec(
  command: string,
  callback?: (error: ExecException | null, stdout: string, stderr: string) => void,
): ChildProcess;
export function exec(
  command: string,
  options: ExecOptionsWithBufferEncoding,
  callback?: (error: ExecException | null, stdout: Buffer, stderr: Buffer) => void,
): ChildProcess;
export function exec(
  command: string,
  options: ExecOptionsWithStringEncoding,
  callback?: (error: ExecException | null, stdout: string, stderr: string) => void,
): ChildProcess;
export function exec(
  command: string,
  options: ExecOptions | undefined | null,
  callback?: (
    error: ExecException | null,
    stdout: string | Buffer,
    stderr: string | Buffer,
  ) => void,
): ChildProcess;
export function exec(
  command: string,
  optionsOrCallback?: ExecOptions | ExecCallback | null,
  callback?: ExecCallback,
): ChildProcess {
  const normalized = normalizeExecArgs(command, optionsOrCallback, callback);
  return execFile(normalized.file, normalized.options, normalized.callback as any);
}

// ── exec.__promisify__ ─────────────────────────────────────────────────────

function execPromisified(command: string, options?: ExecOptions | null) {
  const promise = new Promise<{ stdout: string | Buffer; stderr: string | Buffer }>(
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
  return promise as PromiseWithChild<{ stdout: string | Buffer; stderr: string | Buffer }>;
}

(exec as any).__promisify__ = execPromisified;
