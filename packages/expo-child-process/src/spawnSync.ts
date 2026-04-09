/**
 * spawnSync(), following the Node.js source at
 * https://github.com/nodejs/node/blob/main/lib/child_process.js
 */

import { Buffer as RuntimeBuffer } from "buffer";

import type { SpawnSyncOptions, SpawnSyncReturns } from "./types";

import { normalizeSignal } from "./constants";
import { nativeModule, type NativeSpawnSyncConfig } from "./native";
import { normalizeSpawnArguments, normalizeStdio } from "./spawn";

type NodeBuffer = import("buffer").Buffer;

const spawnSyncImpl = (
  command: string,
  args?: readonly string[] | SpawnSyncOptions,
  options?: SpawnSyncOptions,
): SpawnSyncReturns<string | NodeBuffer> => {
  const normalized = normalizeSpawnArguments(command, args as any, options as any);
  const opts: SpawnSyncOptions = {
    maxBuffer: 1024 * 1024,
    ...normalized.options,
  };

  const killSignal = normalizeSignal(opts.killSignal);
  const stdioCfg = normalizeStdio(opts.stdio);

  let inputBase64: string | null = null;
  if (opts.input != null) {
    if (typeof opts.input === "string") {
      inputBase64 = bytesToBase64(new TextEncoder().encode(opts.input));
    } else if (opts.input instanceof Uint8Array) {
      inputBase64 = bytesToBase64(opts.input);
    }
  }

  const config: NativeSpawnSyncConfig = {
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
    shell: false,
    detached: false,
    uid: opts.uid ?? null,
    gid: opts.gid ?? null,
    killSignal,
    timeoutMs: opts.timeout ?? null,
    inputBase64,
  };

  const result = nativeModule.spawnSync(config);

  const encoding = opts.encoding;
  const useBuffer = encoding === "buffer" || encoding === null || encoding === undefined;

  const stdout = decodeOutput(result.stdout ?? "", useBuffer, encoding);
  const stderr = decodeOutput(result.stderr ?? "", useBuffer, encoding);

  const ret: SpawnSyncReturns<any> = {
    pid: result.pid ?? 0,
    output: [null, stdout, stderr],
    stdout,
    stderr,
    status: result.status ?? null,
    signal: result.signal ?? null,
  };

  if (result.error) {
    ret.error = new Error(result.error);
  }

  return ret;
};

export const spawnSync: typeof import("child_process").spawnSync =
  spawnSyncImpl as typeof import("child_process").spawnSync;

type BufferEncoding = "utf8" | "utf-8" | "ascii" | "latin1" | "hex" | "base64";

function decodeOutput(
  base64: string,
  useBuffer: boolean,
  encoding?: string | null,
): string | NodeBuffer {
  const bytes = base64ToBuffer(base64);
  return useBuffer ? bytes : bytes.toString((encoding ?? "utf8") as BufferEncoding);
}

function base64ToBuffer(base64: string): NodeBuffer {
  return RuntimeBuffer.from(base64, "base64") as NodeBuffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  return RuntimeBuffer.from(bytes).toString("base64");
}
