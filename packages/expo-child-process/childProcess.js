import NativeModule from "./ExpoChildProcessModule";

const POLL_INTERVAL_MS = 50;
const BUFFER_ENCODING = "buffer";
const DEFAULT_ENCODING = "utf8";
const DEFAULT_MAX_BUFFER = 1024 * 1024;

class SimpleEventEmitter {
  constructor() {
    this._listeners = new Map();
  }

  addListener(event, listener) {
    return this.on(event, listener);
  }

  on(event, listener) {
    const listeners = this._listeners.get(event) ?? [];
    listeners.push(listener);
    this._listeners.set(event, listeners);
    return this;
  }

  once(event, listener) {
    const wrapped = (...args) => {
      this.off(event, wrapped);
      listener(...args);
    };

    wrapped._originalListener = listener;
    return this.on(event, wrapped);
  }

  off(event, listener) {
    const listeners = this._listeners.get(event);
    if (!listeners) {
      return this;
    }

    this._listeners.set(
      event,
      listeners.filter((entry) => entry !== listener && entry._originalListener !== listener),
    );
    return this;
  }

  removeListener(event, listener) {
    return this.off(event, listener);
  }

  emit(event, ...args) {
    const listeners = this._listeners.get(event) ?? [];
    for (const listener of [...listeners]) {
      listener(...args);
    }
    return listeners.length > 0;
  }

  removeAllListeners(event) {
    if (event == null) {
      this._listeners.clear();
    } else {
      this._listeners.delete(event);
    }
    return this;
  }
}

class ChildReadable extends SimpleEventEmitter {
  constructor() {
    super();
    this._decoder = null;
    this._paused = false;
    this._queued = [];
    this.readable = true;
  }

  setEncoding(encoding) {
    if (encoding !== DEFAULT_ENCODING) {
      throw new Error(`Unsupported encoding: ${encoding}`);
    }
    this._decoder = new TextDecoder(DEFAULT_ENCODING);
    return this;
  }

  pause() {
    this._paused = true;
    return this;
  }

  resume() {
    this._paused = false;
    while (this._queued.length > 0) {
      this.emit("data", this._formatChunk(this._queued.shift()));
    }
    return this;
  }

  pipe(destination) {
    this.on("data", (chunk) => {
      destination.write(chunk);
    });
    return destination;
  }

  destroy() {
    this.readable = false;
    this.emit("close");
  }

  _pushBase64Chunk(base64) {
    const bytes = base64ToBytes(base64);
    if (this._paused) {
      this._queued.push(bytes);
      return;
    }
    this.emit("data", this._formatChunk(bytes));
  }

  _end() {
    this.readable = false;
    this.emit("end");
    this.emit("close");
  }

  _formatChunk(bytes) {
    if (this._decoder) {
      return this._decoder.decode(bytes);
    }
    return bytes;
  }
}

class ChildWritable extends SimpleEventEmitter {
  constructor(owner) {
    super();
    this._owner = owner;
    this.writable = true;
  }

  write(chunk, encoding = DEFAULT_ENCODING, callback) {
    try {
      NativeModule.write(this._owner._id, chunkToBase64(chunk, encoding));
      callback?.();
      return true;
    } catch (error) {
      callback?.(error);
      this._owner.emit("error", error);
      return false;
    }
  }

  end(chunk, encoding = DEFAULT_ENCODING, callback) {
    if (chunk != null) {
      this.write(chunk, encoding);
    }
    NativeModule.closeStdin(this._owner._id);
    this.writable = false;
    this.emit("finish");
    callback?.();
    return this;
  }

  destroy(error) {
    try {
      NativeModule.closeStdin(this._owner._id);
    } finally {
      this.writable = false;
      if (error) {
        this.emit("error", error);
      }
      this.emit("close");
    }
  }
}

export class ChildProcess extends SimpleEventEmitter {
  constructor(info, options) {
    super();
    this._id = info.id;
    this._pollHandle = null;
    this._closed = false;
    this._timeoutHandle = null;
    this._stdio = normalizeStdio(options?.stdio);
    this.connected = false;
    this.exitCode = null;
    this.killed = false;
    this.pid = info.pid ?? null;
    this.signalCode = null;
    this.spawnargs = info.spawnargs ?? [];
    this.spawnfile = info.spawnfile ?? "";
    this.stdin = this._stdio[0] === "pipe" ? new ChildWritable(this) : null;
    this.stdout = this._stdio[1] === "pipe" ? new ChildReadable() : null;
    this.stderr = this._stdio[2] === "pipe" ? new ChildReadable() : null;

    queueMicrotask(() => {
      this.emit("spawn");
    });

    if (typeof options?.timeout === "number" && options.timeout > 0) {
      this._timeoutHandle = setTimeout(() => {
        const error = new Error(`Child process timed out after ${options.timeout}ms`);
        error.code = "ETIMEDOUT";
        this.emit("error", error);
        this.kill("SIGTERM");
      }, options.timeout);
    }

    if (options?.signal) {
      if (options.signal.aborted) {
        this.kill("SIGTERM");
      } else {
        const onAbort = () => {
          this.kill("SIGTERM");
        };
        options.signal.addEventListener("abort", onAbort, { once: true });
        this.once("close", () => {
          options.signal.removeEventListener("abort", onAbort);
        });
      }
    }

    this._pollHandle = setInterval(() => {
      this._poll();
    }, POLL_INTERVAL_MS);
  }

  kill(signal = "SIGTERM") {
    const normalizedSignal = normalizeSignal(signal);
    const didKill = NativeModule.kill(this._id, normalizedSignal);
    this.killed = didKill || this.killed;
    return didKill;
  }

  send() {
    throw new Error("IPC is not implemented for expo-child-process");
  }

  disconnect() {
    throw new Error("IPC is not implemented for expo-child-process");
  }

  ref() {
    return this;
  }

  unref() {
    return this;
  }

  _poll() {
    if (this._closed) {
      return;
    }

    try {
      const state = NativeModule.poll(this._id);

      for (const chunk of state.stdout ?? []) {
        this.stdout?._pushBase64Chunk(chunk);
      }
      for (const chunk of state.stderr ?? []) {
        this.stderr?._pushBase64Chunk(chunk);
      }

      if (state.exited) {
        this.exitCode = state.exitCode ?? null;
        this.signalCode = state.signal ?? null;
        this._close();
      }
    } catch (error) {
      this.emit("error", error);
      this._close();
    }
  }

  _close() {
    if (this._closed) {
      return;
    }
    this._closed = true;
    if (this._pollHandle) {
      clearInterval(this._pollHandle);
      this._pollHandle = null;
    }
    if (this._timeoutHandle) {
      clearTimeout(this._timeoutHandle);
      this._timeoutHandle = null;
    }
    this.stdout?._end();
    this.stderr?._end();
    NativeModule.cleanup(this._id);
    this.emit("exit", this.exitCode, this.signalCode);
    this.emit("close", this.exitCode, this.signalCode);
  }
}

function normalizeSpawnArgs(args, options) {
  if (Array.isArray(args)) {
    return [args, options ?? {}];
  }
  return [[], args ?? {}];
}

function normalizeExecArgs(options, callback) {
  if (typeof options === "function") {
    return [{}, options];
  }
  return [options ?? {}, callback];
}

function normalizeExecFileArgs(args, options, callback) {
  if (Array.isArray(args)) {
    if (typeof options === "function") {
      return [args, {}, options];
    }
    return [args, options ?? {}, callback];
  }
  if (typeof args === "function") {
    return [[], {}, args];
  }
  if (typeof options === "function") {
    return [[], args ?? {}, options];
  }
  return [[], args ?? {}, options];
}

function normalizeForkArgs(args, options) {
  if (Array.isArray(args)) {
    return [args, options ?? {}];
  }
  return [[], args ?? {}];
}

function normalizeStdio(stdio) {
  if (Array.isArray(stdio)) {
    return [stdio[0] ?? "pipe", stdio[1] ?? "pipe", stdio[2] ?? "pipe"];
  }
  if (typeof stdio === "string") {
    return [stdio, stdio, stdio];
  }
  return ["pipe", "pipe", "pipe"];
}

function buildSpawnConfig(file, args, options) {
  const env = options.env
    ? Object.fromEntries(Object.entries(options.env).map(([key, value]) => [key, String(value)]))
    : null;

  return {
    args,
    detached: Boolean(options.detached),
    env,
    file,
    cwd: options.cwd ?? null,
    shell: options.shell ?? false,
    stdio: normalizeStdio(options.stdio),
    timeoutMs: options.timeout ?? null,
  };
}

export function spawn(file, args, options) {
  const [normalizedArgs, normalizedOptions] = normalizeSpawnArgs(args, options);
  const info = NativeModule.spawn(buildSpawnConfig(file, normalizedArgs, normalizedOptions));
  return new ChildProcess(info, normalizedOptions);
}

export function exec(command, options, callback) {
  const [normalizedOptions, normalizedCallback] = normalizeExecArgs(options, callback);
  const encoding = normalizedOptions.encoding ?? DEFAULT_ENCODING;
  const maxBuffer = normalizedOptions.maxBuffer ?? DEFAULT_MAX_BUFFER;
  const child = spawn(command, [], {
    ...normalizedOptions,
    shell: normalizedOptions.shell ?? true,
  });

  collectOutput(child, encoding, maxBuffer, command, normalizedCallback);
  return child;
}

export function execFile(file, args, options, callback) {
  const [normalizedArgs, normalizedOptions, normalizedCallback] = normalizeExecFileArgs(
    args,
    options,
    callback,
  );
  const encoding = normalizedOptions.encoding ?? DEFAULT_ENCODING;
  const maxBuffer = normalizedOptions.maxBuffer ?? DEFAULT_MAX_BUFFER;
  const child = spawn(file, normalizedArgs, {
    ...normalizedOptions,
    shell: normalizedOptions.shell ?? false,
  });

  collectOutput(
    child,
    encoding,
    maxBuffer,
    [file, ...normalizedArgs].join(" "),
    normalizedCallback,
  );
  return child;
}

export function fork(modulePath, args, options) {
  const [normalizedArgs, normalizedOptions] = normalizeForkArgs(args, options);
  const execPath = normalizedOptions.execPath ?? "node";
  const execArgv = normalizedOptions.execArgv ?? [];
  const child = spawn(execPath, [...execArgv, modulePath, ...normalizedArgs], normalizedOptions);
  child.connected = false;
  return child;
}

export function spawnSync(file, args, options) {
  const [normalizedArgs, normalizedOptions] = normalizeSpawnArgs(args, options);
  const result = NativeModule.spawnSync({
    ...buildSpawnConfig(file, normalizedArgs, normalizedOptions),
    inputBase64:
      normalizedOptions.input != null
        ? chunkToBase64(
            normalizedOptions.input,
            normalizedOptions.encoding === BUFFER_ENCODING ? BUFFER_ENCODING : DEFAULT_ENCODING,
          )
        : null,
  });

  return decodeSyncResult(result, normalizedOptions.encoding ?? BUFFER_ENCODING);
}

export function execSync(command, options = {}) {
  const result = NativeModule.spawnSync({
    ...buildSpawnConfig(command, [], { ...options, shell: options.shell ?? true }),
    inputBase64: null,
  });
  return unwrapSyncOutput(result, options.encoding ?? BUFFER_ENCODING, command);
}

export function execFileSync(file, args, options) {
  const [normalizedArgs, normalizedOptions] = normalizeSpawnArgs(args, options);
  const result = NativeModule.spawnSync({
    ...buildSpawnConfig(file, normalizedArgs, {
      ...normalizedOptions,
      shell: normalizedOptions.shell ?? false,
    }),
    inputBase64: null,
  });
  return unwrapSyncOutput(
    result,
    normalizedOptions.encoding ?? BUFFER_ENCODING,
    [file, ...normalizedArgs].join(" "),
  );
}

export function getMessage() {
  return NativeModule.getMessage();
}

export function getTestScriptPath() {
  return NativeModule.getTestScriptPath();
}

function collectOutput(child, encoding, maxBuffer, command, callback) {
  const stdoutChunks = [];
  const stderrChunks = [];
  let bufferedSize = 0;
  let storedError = null;

  const pushChunk = (target, chunk) => {
    target.push(chunk);
    bufferedSize += getChunkSize(chunk);
    if (bufferedSize > maxBuffer && !storedError) {
      storedError = new Error("maxBuffer exceeded");
      child.kill("SIGTERM");
    }
  };

  if (encoding !== BUFFER_ENCODING) {
    child.stdout?.setEncoding(DEFAULT_ENCODING);
    child.stderr?.setEncoding(DEFAULT_ENCODING);
  }
  child.stdout?.on("data", (chunk) => pushChunk(stdoutChunks, chunk));
  child.stderr?.on("data", (chunk) => pushChunk(stderrChunks, chunk));
  child.on("error", (error) => {
    storedError = error;
  });
  child.on("close", (code, signal) => {
    const stdout = joinChunks(stdoutChunks, encoding);
    const stderr = joinChunks(stderrChunks, encoding);

    if (storedError || code !== 0 || signal) {
      const error = storedError ?? new Error(`Command failed: ${command}`);
      error.code = code;
      error.signal = signal;
      error.stdout = stdout;
      error.stderr = stderr;
      error.cmd = command;
      callback?.(error, stdout, stderr);
      return;
    }

    callback?.(null, stdout, stderr);
  });
}

function decodeSyncResult(result, encoding) {
  const stdout = decodeChunk(result.stdout ?? "", encoding);
  const stderr = decodeChunk(result.stderr ?? "", encoding);
  return {
    output: [null, stdout, stderr],
    pid: result.pid ?? null,
    signal: result.signal ?? null,
    status: result.status ?? null,
    stderr,
    stdout,
  };
}

function unwrapSyncOutput(result, encoding, command) {
  const decoded = decodeSyncResult(result, encoding);
  if (decoded.status !== 0 || decoded.signal) {
    const error = new Error(`Command failed: ${command}`);
    error.status = decoded.status;
    error.signal = decoded.signal;
    error.stdout = decoded.stdout;
    error.stderr = decoded.stderr;
    error.output = decoded.output;
    throw error;
  }
  return decoded.stdout;
}

function decodeChunk(base64, encoding) {
  const bytes = base64ToBytes(base64);
  if (encoding === BUFFER_ENCODING) {
    return bytes;
  }
  return new TextDecoder(DEFAULT_ENCODING).decode(bytes);
}

function joinChunks(chunks, encoding) {
  if (encoding === BUFFER_ENCODING) {
    return concatBytes(chunks.map((chunk) => normalizeToBytes(chunk)));
  }
  return chunks
    .map((chunk) =>
      typeof chunk === "string" ? chunk : new TextDecoder(DEFAULT_ENCODING).decode(chunk),
    )
    .join("");
}

function normalizeToBytes(chunk) {
  if (chunk instanceof Uint8Array) {
    return chunk;
  }
  return new TextEncoder().encode(chunk);
}

function concatBytes(parts) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function chunkToBase64(chunk, encoding = DEFAULT_ENCODING) {
  let bytes;
  if (chunk instanceof Uint8Array) {
    bytes = chunk;
  } else if (typeof chunk === "string") {
    if (encoding !== DEFAULT_ENCODING) {
      throw new Error(`Unsupported encoding: ${encoding}`);
    }
    bytes = new TextEncoder().encode(chunk);
  } else {
    throw new Error("Unsupported chunk type");
  }
  return bytesToBase64(bytes);
}

function base64ToBytes(base64) {
  if (!base64) {
    return new Uint8Array();
  }
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  if (typeof globalThis.atob !== "function") {
    throw new Error("Base64 decoding is not available in this runtime");
  }
  const binary = globalThis.atob(base64);
  const output = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    output[index] = binary.charCodeAt(index);
  }
  return output;
}

function bytesToBase64(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  if (typeof globalThis.btoa !== "function") {
    throw new Error("Base64 encoding is not available in this runtime");
  }
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }
  return globalThis.btoa(binary);
}

function getChunkSize(chunk) {
  return typeof chunk === "string" ? chunk.length : chunk.byteLength;
}

function normalizeSignal(signal) {
  if (typeof signal === "number") {
    return signalToName(signal);
  }
  return signal;
}

function signalToName(signal) {
  const entry = Object.entries(SIGNAL_NUMBERS).find(([, value]) => value === signal);
  return entry?.[0] ?? "SIGTERM";
}

const SIGNAL_NUMBERS = {
  SIGHUP: 1,
  SIGINT: 2,
  SIGQUIT: 3,
  SIGABRT: 6,
  SIGKILL: 9,
  SIGALRM: 14,
  SIGTERM: 15,
};

const ExpoChildProcess = {
  ChildProcess,
  exec,
  execFile,
  execFileSync,
  execSync,
  fork,
  getMessage,
  getTestScriptPath,
  spawn,
  spawnSync,
};

export default ExpoChildProcess;
