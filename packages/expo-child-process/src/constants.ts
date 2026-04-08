export const MAX_BUFFER = 1024 * 1024;

export const SIGNAL_NAMES: Record<string, number> = {
  SIGHUP: 1,
  SIGINT: 2,
  SIGQUIT: 3,
  SIGILL: 4,
  SIGTRAP: 5,
  SIGABRT: 6,
  SIGEMT: 7,
  SIGFPE: 8,
  SIGKILL: 9,
  SIGBUS: 10,
  SIGSEGV: 11,
  SIGSYS: 12,
  SIGPIPE: 13,
  SIGALRM: 14,
  SIGTERM: 15,
  SIGURG: 16,
  SIGSTOP: 17,
  SIGTSTP: 18,
  SIGCONT: 19,
  SIGCHLD: 20,
  SIGTTIN: 21,
  SIGTTOU: 22,
  SIGIO: 23,
  SIGXCPU: 24,
  SIGXFSZ: 25,
  SIGVTALRM: 26,
  SIGPROF: 27,
  SIGWINCH: 28,
  SIGINFO: 29,
  SIGUSR1: 30,
  SIGUSR2: 31,
};

const SIGNAL_NUMBERS: Record<number, string> = {};
for (const [name, num] of Object.entries(SIGNAL_NAMES)) {
  SIGNAL_NUMBERS[num] = name;
}
export { SIGNAL_NUMBERS };

export function normalizeSignal(signal: string | number | undefined): string {
  if (signal == null) return "SIGTERM";
  if (typeof signal === "number") {
    return SIGNAL_NUMBERS[signal] ?? "SIGTERM";
  }
  return signal;
}

export function convertToValidSignal(signal: string | number): string {
  if (typeof signal === "number") {
    const name = SIGNAL_NUMBERS[signal];
    if (name) return name;
    throw new Error(`Unknown signal: ${signal}`);
  }
  if (SIGNAL_NAMES[signal] !== undefined) return signal;
  throw new Error(`Unknown signal: ${signal}`);
}
