/**
 * execFile(), following the Node.js source at
 * https://github.com/nodejs/node/blob/main/lib/child_process.js
 *
 * Spawns the command directly without a shell (unless shell option is set).
 * Buffers stdout/stderr and invokes the callback when the child exits.
 */

import { Buffer as RuntimeBuffer } from "buffer";

import type { ExecFileException, ExecFileOptions, SpawnOptions, Unpromisified } from "./types";

import { MAX_BUFFER } from "./constants";
import { spawn } from "./spawn";

type NodeBuffer = import("buffer").Buffer;

export type ExecFileCallback = Parameters<
  Unpromisified<typeof import("node:child_process").execFile>
>[3];

// ── normalizeExecFileArgs ──────────────────────────────────────────────────

function normalizeExecFileArgs(
  ...params: Parameters<typeof import("node:child_process").execFile>
): {
  file: string;
  args: string[];
  options: ExecFileOptions;
  callback: ExecFileCallback | undefined;
} {
  let [file, args, options, callback] = params;

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
    options: options ?? {},
    callback: callback ?? undefined,
  };
}

const execFileImpl: Unpromisified<typeof import("node:child_process").execFile> = (
  file,
  argsOrOptionsOrCallback,
  optionsOrCallback,
  callback,
) => {
  const normalized = normalizeExecFileArgs(
    file,
    argsOrOptionsOrCallback,
    optionsOrCallback,
    callback,
  );
  const { args, callback: cb } = normalized;
  const options = {
    encoding: "utf8",
    timeout: 0,
    maxBuffer: MAX_BUFFER,
    killSignal: "SIGTERM",
    cwd: undefined,
    env: undefined,
    shell: false,
    signal: undefined,
    ...normalized.options,
  } as const satisfies SpawnOptions & ExecFileOptions;

  if (!options.encoding || options.encoding !== "buffer" || !isBufferEncoding(options.encoding)) {
    throw new Error(`Invalid encoding: ${options.encoding}`);
  }

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
  const stdoutChunks: (string | NodeBuffer)[] = [];
  const stderrChunks: (string | NodeBuffer)[] = [];
  let stdoutLen = 0;
  let stderrLen = 0;
  let killed = false;
  let exited = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let ex: (ExecFileException & { cmd?: string }) | null = null;

  function exitHandler(code: number | null, signal: NodeJS.Signals | null): void {
    if (exited) return;
    exited = true;

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    let encoding: BufferEncoding;
    if (options.encoding) {
      if (!isBufferEncoding(options.encoding)) {
        throw new Error(`Invalid encoding: ${options.encoding}`);
      }
      encoding = options.encoding;
    } else {
      encoding = "utf8";
    }

    const stdout = joinOutput(stdoutChunks, useBufferEncoding, encoding);
    const stderr = joinOutput(stderrChunks, useBufferEncoding, encoding);

    if (!ex && code === 0 && signal === null) {
      cb?.(null, stdout as any, stderr as any);
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
    cb?.(ex, stdout as any, stderr as any);
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
    child.stdout.on("data", (chunk: string | NodeBuffer) => {
      const length = RuntimeBuffer.byteLength(chunk);
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
    child.stderr.on("data", (chunk: string | NodeBuffer) => {
      const length = RuntimeBuffer.byteLength(chunk);
      stderrLen += length;
      if (stderrLen > options.maxBuffer) {
        ex = new Error("stderr maxBuffer exceeded") as ExecFileException;
        killChild();
      } else {
        stderrChunks.push(chunk);
      }
    });
  }

  child.addListener("close", exitHandler);
  child.addListener("error", errorHandler);

  return child;
};

function isBufferEncoding(encoding: string): encoding is BufferEncoding {
  return encodings.has(encoding as BufferEncoding);
}

const encodings = new Set<BufferEncoding>([
  "ascii",
  "utf8",
  "utf-8",
  "utf16le",
  "utf-16le",
  "ucs2",
  "ucs-2",
  "base64",
  "base64url",
  "latin1",
  "binary",
  "hex",
]);

export const execFile = Object.assign(execFileImpl, {
  __promisify__: execFilePromisified,
}) as unknown as typeof import("node:child_process").execFile;

// ── execFile.__promisify__ ─────────────────────────────────────────────────

function execFilePromisified(command: string, options?: ExecFileOptions | null) {
  const promise = new Promise<
    Omit<Awaited<typeof import("child_process").execFile.__promisify__>, "child">
  >((resolve, reject) => {
    (promise as any).child = execFile(command, options ?? {}, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout as string;
        err.stderr = stderr as string;
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
  return promise as unknown as typeof import("child_process").execFile.__promisify__;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function joinOutput(
  chunks: (string | NodeBuffer)[],
  asBuffer: boolean,
  encoding: BufferEncoding,
): string | NodeBuffer {
  const buffers = chunks.map((chunk) =>
    typeof chunk === "string" ? (RuntimeBuffer.from(chunk, encoding) as NodeBuffer) : chunk,
  );
  const output = RuntimeBuffer.concat(buffers) as NodeBuffer;
  return asBuffer ? output : output.toString(encoding);
}
