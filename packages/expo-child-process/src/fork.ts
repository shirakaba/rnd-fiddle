/**
 * fork(), following the Node.js source at
 * https://github.com/nodejs/node/blob/main/lib/child_process.js
 *
 * Limited implementation: spawns execPath (default: "node") with the module
 * path. Does NOT set up an IPC channel (would require node:net). IPC-related
 * functionality (send, disconnect, 'message' event) is not available.
 */

import type { ChildProcess } from "./ChildProcess";
import type { ForkOptions, StdioOptions } from "./types";

import { spawn } from "./spawn";

function stdioStringToArray(stdio: string, channel: "ignore"): StdioOptions {
  switch (stdio) {
    case "ignore":
      return ["ignore", "ignore", "ignore", channel];
    case "pipe":
      return ["pipe", "pipe", "pipe", channel];
    case "inherit":
      return ["inherit", "inherit", "inherit", channel];
    default:
      return ["pipe", "pipe", "pipe", channel];
  }
}

const forkImpl = (
  modulePath: string,
  args?: readonly string[] | ForkOptions,
  options?: ForkOptions,
): ChildProcess => {
  let normalizedArgs: string[];
  if (Array.isArray(args)) {
    normalizedArgs = args.slice();
  } else if (args != null && typeof args === "object") {
    options = args as ForkOptions;
    normalizedArgs = [];
  } else {
    normalizedArgs = [];
  }

  const opts: ForkOptions = { ...options };
  const execPath = opts.execPath ?? "node";
  const execArgv = opts.execArgv ?? [];

  const spawnArgs = [...execArgv, modulePath, ...normalizedArgs];

  // Set up stdio — normally fork includes 'ipc', but we don't support IPC.
  // Just use pipe/inherit based on silent option.
  let stdio: StdioOptions;
  if (typeof opts.stdio === "string") {
    stdio = stdioStringToArray(opts.stdio, "ignore");
  } else if (Array.isArray(opts.stdio)) {
    stdio = opts.stdio;
  } else {
    stdio = stdioStringToArray(opts.silent ? "pipe" : "inherit", "ignore");
  }

  return spawn(execPath, spawnArgs, {
    ...opts,
    stdio,
  });
};

export const fork: typeof import("child_process").fork =
  forkImpl as typeof import("child_process").fork;
