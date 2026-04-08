/**
 * execFile(), following the Node.js source at
 * https://github.com/nodejs/node/blob/main/lib/child_process.js
 *
 * Spawns the command directly without a shell (unless shell option is set).
 * Buffers stdout/stderr and invokes the callback when the child exits.
 */

import type { ChildProcess } from "./ChildProcess";
import type {
  ExecFileException,
  ExecFileOptions,
  ExecFileOptionsWithBufferEncoding,
  ExecFileOptionsWithStringEncoding,
  PromiseWithChild,
} from "./types";

import { MAX_BUFFER } from "./constants";
import { spawn } from "./spawn";

type ExecFileCallback = (
  error: ExecFileException | null,
  stdout: string | Uint8Array,
  stderr: string | Uint8Array,
) => void;

// ── normalizeExecFileArgs ──────────────────────────────────────────────────

function normalizeExecFileArgs(
  file: string,
  args?: readonly string[] | ExecFileOptions | ExecFileCallback | null,
  options?: ExecFileOptions | ExecFileCallback | null,
  callback?: ExecFileCallback,
): {
  file: string;
  args: string[];
  options: ExecFileOptions;
  callback: ExecFileCallback | undefined;
} {
  let normalizedArgs: string[];

  if (Array.isArray(args)) {
    normalizedArgs = args.slice();
  } else if (args != null && typeof args === "object" && !Array.isArray(args)) {
    callback = options as ExecFileCallback | undefined;
    options = args as ExecFileOptions;
    normalizedArgs = [];
  } else if (typeof args === "function") {
    callback = args;
    options = null;
    normalizedArgs = [];
  } else {
    normalizedArgs = [];
  }

  if (typeof options === "function") {
    callback = options;
    options = null;
  }

  return {
    file,
    args: normalizedArgs,
    options: (options as ExecFileOptions) ?? {},
    callback: callback ?? undefined,
  };
}

// ── execFile ───────────────────────────────────────────────────────────────

export function execFile(
  file: string,
  callback?: (error: ExecFileException | null, stdout: string, stderr: string) => void,
): ChildProcess;
export function execFile(
  file: string,
  args: readonly string[] | undefined | null,
  callback?: (error: ExecFileException | null, stdout: string, stderr: string) => void,
): ChildProcess;
export function execFile(
  file: string,
  options: ExecFileOptionsWithBufferEncoding,
  callback?: (error: ExecFileException | null, stdout: Uint8Array, stderr: Uint8Array) => void,
): ChildProcess;
export function execFile(
  file: string,
  args: readonly string[] | undefined | null,
  options: ExecFileOptionsWithBufferEncoding,
  callback?: (error: ExecFileException | null, stdout: Uint8Array, stderr: Uint8Array) => void,
): ChildProcess;
export function execFile(
  file: string,
  options: ExecFileOptionsWithStringEncoding,
  callback?: (error: ExecFileException | null, stdout: string, stderr: string) => void,
): ChildProcess;
export function execFile(
  file: string,
  args: readonly string[] | undefined | null,
  options: ExecFileOptionsWithStringEncoding,
  callback?: (error: ExecFileException | null, stdout: string, stderr: string) => void,
): ChildProcess;
export function execFile(
  file: string,
  options: ExecFileOptions | undefined | null,
  callback?: ExecFileCallback | null,
): ChildProcess;
export function execFile(
  file: string,
  args: readonly string[] | undefined | null,
  options: ExecFileOptions | undefined | null,
  callback?: ExecFileCallback | null,
): ChildProcess;
export function execFile(
  file: string,
  argsOrOptionsOrCallback?: any,
  optionsOrCallback?: any,
  callback?: ExecFileCallback,
): ChildProcess {
  const normalized = normalizeExecFileArgs(
    file,
    argsOrOptionsOrCallback,
    optionsOrCallback,
    callback,
  );
  const { args, callback: cb } = normalized;
  const options = {
    encoding: "utf8" as string | null,
    timeout: 0,
    maxBuffer: MAX_BUFFER,
    killSignal: "SIGTERM" as string | number,
    cwd: undefined as string | undefined,
    env: undefined as Record<string, string | undefined> | undefined,
    shell: false as boolean | string,
    signal: undefined as AbortSignal | undefined,
    ...normalized.options,
  };

  const child = spawn(file, args, {
    cwd: options.cwd,
    env: options.env,
    gid: options.gid,
    shell: options.shell,
    signal: options.signal,
    uid: options.uid,
    windowsHide: options.windowsHide,
    windowsVerbatimArguments: options.windowsVerbatimArguments,
  });

  if (!cb) return child;

  const useBufferEncoding = options.encoding === "buffer" || options.encoding === null;
  const stdoutChunks: (string | Uint8Array)[] = [];
  const stderrChunks: (string | Uint8Array)[] = [];
  let stdoutLen = 0;
  let stderrLen = 0;
  let killed = false;
  let exited = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let ex: (ExecFileException & { cmd?: string }) | null = null;

  function exitHandler(code: number | null, signal: string | null): void {
    if (exited) return;
    exited = true;

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    const stdout = joinOutput(stdoutChunks, useBufferEncoding);
    const stderr = joinOutput(stderrChunks, useBufferEncoding);

    if (!ex && code === 0 && signal === null) {
      cb(null, stdout as any, stderr as any);
      return;
    }

    let cmd = file;
    if (args.length) cmd += ` ${args.join(" ")}`;

    if (!ex) {
      const msg = `Command failed: ${cmd}\n${typeof stderr === "string" ? stderr : ""}`;
      ex = new Error(msg) as ExecFileException;
      (ex as any).code = code;
      ex.killed = child.killed || killed;
      ex.signal = signal ?? undefined;
    }
    ex.cmd = cmd;
    cb(ex, stdout as any, stderr as any);
  }

  function errorHandler(e: Error): void {
    ex = e as ExecFileException;
    child.stdout?.destroy();
    child.stderr?.destroy();
    exitHandler(null, null);
  }

  function killChild(): void {
    child.stdout?.destroy();
    child.stderr?.destroy();
    killed = true;
    try {
      child.kill(options.killSignal);
    } catch (e: any) {
      ex = e;
      exitHandler(null, null);
    }
  }

  if (options.timeout > 0) {
    timeoutId = setTimeout(() => {
      killChild();
      timeoutId = null;
    }, options.timeout);
  }

  if (child.stdout) {
    if (!useBufferEncoding) {
      child.stdout.setEncoding(options.encoding ?? "utf8");
    }
    child.stdout.on("data", (chunk: string | Uint8Array) => {
      const length = typeof chunk === "string" ? chunk.length : chunk.byteLength;
      stdoutLen += length;
      if (stdoutLen > options.maxBuffer) {
        ex = new Error("stdout maxBuffer exceeded") as ExecFileException;
        killChild();
      } else {
        stdoutChunks.push(chunk);
      }
    });
  }

  if (child.stderr) {
    if (!useBufferEncoding) {
      child.stderr.setEncoding(options.encoding ?? "utf8");
    }
    child.stderr.on("data", (chunk: string | Uint8Array) => {
      const length = typeof chunk === "string" ? chunk.length : chunk.byteLength;
      stderrLen += length;
      if (stderrLen > options.maxBuffer) {
        ex = new Error("stderr maxBuffer exceeded") as ExecFileException;
        killChild();
      } else {
        stderrChunks.push(chunk);
      }
    });
  }

  child.addListener("close", exitHandler as any);
  child.addListener("error", errorHandler);

  return child;
}

// ── execFile.__promisify__ ─────────────────────────────────────────────────

function execFilePromisified(
  file: string,
  args?: readonly string[] | null,
  options?: ExecFileOptions | null,
) {
  const promise = new Promise<{ stdout: string | Uint8Array; stderr: string | Uint8Array }>(
    (resolve, reject) => {
      const child = execFile(file, args, options, (err: any, stdout: any, stderr: any) => {
        if (err) {
          err.stdout = stdout;
          err.stderr = stderr;
          reject(err);
        } else {
          resolve({ stdout, stderr });
        }
      });
      (promise as any).child = child;
    },
  );
  return promise as PromiseWithChild<{ stdout: string | Uint8Array; stderr: string | Uint8Array }>;
}

(execFile as any).__promisify__ = execFilePromisified;

// ── Helpers ────────────────────────────────────────────────────────────────

function joinOutput(chunks: (string | Uint8Array)[], asBuffer: boolean): string | Uint8Array {
  if (!asBuffer) {
    return chunks
      .map((c) => (typeof c === "string" ? c : new TextDecoder("utf8").decode(c)))
      .join("");
  }
  const byteChunks = chunks.map((c) => (typeof c === "string" ? new TextEncoder().encode(c) : c));
  const totalLength = byteChunks.reduce((sum, c) => sum + c.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of byteChunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
