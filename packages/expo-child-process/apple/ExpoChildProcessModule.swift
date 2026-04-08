import ExpoModulesCore
import Foundation

#if os(macOS)
import Darwin

private let childProcessEventName = "onChildProcessEvent"

// MARK: - Registry

private final class ChildProcessRegistry {
  private let lock = NSLock()
  private var processes: [String: ManagedProcess] = [:]

  func insert(_ managed: ManagedProcess) {
    lock.lock()
    processes[managed.id] = managed
    lock.unlock()
  }

  func get(_ id: String) -> ManagedProcess? {
    lock.lock()
    let value = processes[id]
    lock.unlock()
    return value
  }

  func remove(_ id: String) {
    lock.lock()
    processes.removeValue(forKey: id)
    lock.unlock()
  }
}

// MARK: - ManagedProcess

private final class ManagedProcess {
  let id: String
  let process: Process
  let stdinPipe: Pipe?
  let stdoutPipe: Pipe?
  let stderrPipe: Pipe?

  init(
    id: String,
    process: Process,
    stdinPipe: Pipe?,
    stdoutPipe: Pipe?,
    stderrPipe: Pipe?
  ) {
    self.id = id
    self.process = process
    self.stdinPipe = stdinPipe
    self.stdoutPipe = stdoutPipe
    self.stderrPipe = stderrPipe
  }
}

// MARK: - ProcessSpecification

private struct ProcessSpecification {
  let executablePath: String
  let arguments: [String]
  let environment: [String: String]
  let cwd: String?
  let detached: Bool
  let originalFile: String
  let originalArgs: [String]
  let stdio: [String]

  init(config: [String: Any]) throws {
    guard let file = config["file"] as? String, !file.isEmpty else {
      throw ChildProcessError.invalidArguments("Missing or empty 'file' in spawn config")
    }

    let args = config["args"] as? [String] ?? []
    let shellOption = config["shell"]
    let env = ProcessSpecification.mergedEnvironment(from: config["env"] as? [String: Any])
    let cwd = config["cwd"] as? String
    let detached = (config["detached"] as? Bool) ?? false
    let stdioCfg = (config["stdio"] as? [String]) ?? ["pipe", "pipe", "pipe"]

    originalFile = file
    originalArgs = args
    self.cwd = cwd
    self.detached = detached
    self.environment = env
    self.stdio = [
      stdioCfg.count > 0 ? stdioCfg[0] : "pipe",
      stdioCfg.count > 1 ? stdioCfg[1] : "pipe",
      stdioCfg.count > 2 ? stdioCfg[2] : "pipe",
    ]

    if let shellString = shellOption as? String {
      executablePath = try ProcessSpecification.resolveExecutable(shellString, env: env, cwd: cwd)
      arguments = ["-c", ProcessSpecification.shellCommand(file: file, args: args)]
      return
    }

    if (shellOption as? Bool) == true {
      let shell = env["SHELL"] ?? "/bin/sh"
      executablePath = try ProcessSpecification.resolveExecutable(shell, env: env, cwd: cwd)
      arguments = ["-c", ProcessSpecification.shellCommand(file: file, args: args)]
      return
    }

    executablePath = try ProcessSpecification.resolveExecutable(file, env: env, cwd: cwd)
    arguments = args
  }

  private static func mergedEnvironment(from values: [String: Any]?) -> [String: String] {
    if let values {
      var env: [String: String] = [:]
      for (key, value) in values {
        env[key] = String(describing: value)
      }
      return env
    }
    return ProcessInfo.processInfo.environment
  }

  private static func resolveExecutable(
    _ file: String, env: [String: String], cwd: String?
  ) throws -> String {
    if file.contains("/") {
      return absolutePath(for: file, cwd: cwd)
    }

    let pathEntries = (env["PATH"] ?? "/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin").split(
      separator: ":")
    for entry in pathEntries {
      let candidate = URL(fileURLWithPath: String(entry)).appendingPathComponent(file).path
      if FileManager.default.isExecutableFile(atPath: candidate) {
        return candidate
      }
    }

    throw ChildProcessError.launchFailure("Executable not found in PATH: \(file)")
  }

  private static func absolutePath(for path: String, cwd: String?) -> String {
    if path.hasPrefix("/") { return path }
    let basePath = cwd ?? FileManager.default.currentDirectoryPath
    return URL(
      fileURLWithPath: path,
      relativeTo: URL(fileURLWithPath: basePath, isDirectory: true)
    )
    .standardizedFileURL
    .path
  }

  private static func shellCommand(file: String, args: [String]) -> String {
    ([file] + args).map(shellEscape).joined(separator: " ")
  }

  private static func shellEscape(_ value: String) -> String {
    if value.isEmpty { return "''" }
    return "'\(value.replacingOccurrences(of: "'", with: "'\\''"))'"
  }
}

// MARK: - Errors

private enum ChildProcessError: Error, CustomStringConvertible {
  case invalidArguments(String)
  case invalidProcess(String)
  case launchFailure(String)
  case notSupported(String)

  var description: String {
    switch self {
    case .invalidArguments(let msg),
      .invalidProcess(let msg),
      .launchFailure(let msg),
      .notSupported(let msg):
      return msg
    }
  }
}

// MARK: - Stdio helpers

private func makeStandardInput(for mode: String, pipe: Pipe?) -> Any? {
  switch mode {
  case "pipe": return pipe
  case "ignore": return FileHandle.nullDevice
  case "inherit": return FileHandle.standardInput
  default: return pipe
  }
}

private func makeStandardOutput(for mode: String, pipe: Pipe?) -> Any? {
  switch mode {
  case "pipe": return pipe
  case "ignore": return FileHandle.nullDevice
  case "inherit": return FileHandle.standardOutput
  default: return pipe
  }
}

private func makeStandardError(for mode: String, pipe: Pipe?) -> Any? {
  switch mode {
  case "pipe": return pipe
  case "ignore": return FileHandle.nullDevice
  case "inherit": return FileHandle.standardError
  default: return pipe
  }
}

// MARK: - Signal conversion

private let signalMap: [(String, Int32)] = [
  ("SIGHUP", SIGHUP),
  ("SIGINT", SIGINT),
  ("SIGQUIT", SIGQUIT),
  ("SIGILL", SIGILL),
  ("SIGTRAP", SIGTRAP),
  ("SIGABRT", SIGABRT),
  ("SIGEMT", SIGEMT),
  ("SIGFPE", SIGFPE),
  ("SIGKILL", SIGKILL),
  ("SIGBUS", SIGBUS),
  ("SIGSEGV", SIGSEGV),
  ("SIGSYS", SIGSYS),
  ("SIGPIPE", SIGPIPE),
  ("SIGALRM", SIGALRM),
  ("SIGTERM", SIGTERM),
  ("SIGURG", SIGURG),
  ("SIGSTOP", SIGSTOP),
  ("SIGTSTP", SIGTSTP),
  ("SIGCONT", SIGCONT),
  ("SIGCHLD", SIGCHLD),
  ("SIGTTIN", SIGTTIN),
  ("SIGTTOU", SIGTTOU),
  ("SIGIO", SIGIO),
  ("SIGXCPU", SIGXCPU),
  ("SIGXFSZ", SIGXFSZ),
  ("SIGVTALRM", SIGVTALRM),
  ("SIGPROF", SIGPROF),
  ("SIGWINCH", SIGWINCH),
  ("SIGINFO", SIGINFO),
  ("SIGUSR1", SIGUSR1),
  ("SIGUSR2", SIGUSR2),
]

private func signalNumber(from name: String) -> Int32 {
  for (n, v) in signalMap { if n == name { return v } }
  return SIGTERM
}

private func signalName(from number: Int32) -> String {
  for (n, v) in signalMap { if v == number { return n } }
  return "SIGTERM"
}
#endif

// MARK: - Module definition

public final class ExpoChildProcessModule: Module {
  #if os(macOS)
  private let registry = ChildProcessRegistry()
  #endif

  public func definition() -> ModuleDefinition {
    Name("ExpoChildProcess")

    #if os(macOS)
    Events(childProcessEventName)
    #endif

    Function("spawn") { (config: [String: Any]) throws -> [String: Any] in
      #if os(macOS)
      return try self.spawnProcess(config)
      #else
      throw ChildProcessError.notSupported("child_process is only supported on macOS")
      #endif
    }

    Function("kill") { (id: String, signal: String?) throws -> Bool in
      #if os(macOS)
      guard let managed = self.registry.get(id) else {
        throw ChildProcessError.invalidProcess("Unknown child process: \(id)")
      }
      let sig = signalNumber(from: signal ?? "SIGTERM")
      return Darwin.kill(managed.process.processIdentifier, sig) == 0
      #else
      throw ChildProcessError.notSupported("child_process is only supported on macOS")
      #endif
    }

    Function("writeToStdin") { (id: String, base64Data: String) throws -> Bool in
      #if os(macOS)
      guard let managed = self.registry.get(id),
        let stdinPipe = managed.stdinPipe,
        let data = Data(base64Encoded: base64Data)
      else {
        throw ChildProcessError.invalidProcess("Unable to write to stdin for process: \(id)")
      }
      stdinPipe.fileHandleForWriting.write(data)
      return true
      #else
      throw ChildProcessError.notSupported("child_process is only supported on macOS")
      #endif
    }

    Function("closeStdin") { (id: String) throws -> Bool in
      #if os(macOS)
      guard let managed = self.registry.get(id),
        let stdinPipe = managed.stdinPipe
      else {
        throw ChildProcessError.invalidProcess("Unable to close stdin for process: \(id)")
      }
      try stdinPipe.fileHandleForWriting.close()
      return true
      #else
      throw ChildProcessError.notSupported("child_process is only supported on macOS")
      #endif
    }

    Function("cleanup") { (id: String) -> Bool in
      #if os(macOS)
      self.registry.remove(id)
      return true
      #else
      return false
      #endif
    }

    Function("spawnSync") { (config: [String: Any]) throws -> [String: Any] in
      #if os(macOS)
      return try self.spawnProcessSync(config)
      #else
      throw ChildProcessError.notSupported("child_process is only supported on macOS")
      #endif
    }
  }

  // MARK: - Async spawn (event-based)

  #if os(macOS)
  private func spawnProcess(_ config: [String: Any]) throws -> [String: Any] {
    let spec = try ProcessSpecification(config: config)
    let process = Process()
    let id = UUID().uuidString

    let stdinPipe = spec.stdio[0] == "pipe" ? Pipe() : nil
    let stdoutPipe = spec.stdio[1] == "pipe" ? Pipe() : nil
    let stderrPipe = spec.stdio[2] == "pipe" ? Pipe() : nil

    process.executableURL = URL(fileURLWithPath: spec.executablePath)
    process.arguments = spec.arguments
    process.environment = spec.environment
    if let cwd = spec.cwd {
      process.currentDirectoryURL = URL(fileURLWithPath: cwd, isDirectory: true)
    }
    process.standardInput = makeStandardInput(for: spec.stdio[0], pipe: stdinPipe)
    process.standardOutput = makeStandardOutput(for: spec.stdio[1], pipe: stdoutPipe)
    process.standardError = makeStandardError(for: spec.stdio[2], pipe: stderrPipe)

    let managed = ManagedProcess(
      id: id,
      process: process,
      stdinPipe: stdinPipe,
      stdoutPipe: stdoutPipe,
      stderrPipe: stderrPipe
    )

    let send = makeSendEvent()

    stdoutPipe?.fileHandleForReading.readabilityHandler = { handle in
      autoreleasepool {
        let data = handle.availableData
        if data.isEmpty {
          handle.readabilityHandler = nil
          send(["id": id, "type": "stdoutEnd"])
          return
        }
        send(["id": id, "type": "stdout", "data": data.base64EncodedString()])
      }
    }

    stderrPipe?.fileHandleForReading.readabilityHandler = { handle in
      autoreleasepool {
        let data = handle.availableData
        if data.isEmpty {
          handle.readabilityHandler = nil
          send(["id": id, "type": "stderrEnd"])
          return
        }
        send(["id": id, "type": "stderr", "data": data.base64EncodedString()])
      }
    }

    process.terminationHandler = { proc in
      let exitCode: Any
      let signalValue: Any

      switch proc.terminationReason {
      case .exit:
        exitCode = Int(proc.terminationStatus)
        signalValue = NSNull()
      case .uncaughtSignal:
        exitCode = NSNull()
        signalValue = signalName(from: proc.terminationStatus)
      @unknown default:
        exitCode = NSNull()
        signalValue = NSNull()
      }

      send([
        "id": id,
        "type": "exit",
        "exitCode": exitCode,
        "signal": signalValue,
      ])
    }

    do {
      try process.run()
    } catch {
      send(["id": id, "type": "error", "message": error.localizedDescription])
      throw ChildProcessError.launchFailure("Failed to launch: \(error.localizedDescription)")
    }

    if spec.detached {
      _ = setpgid(process.processIdentifier, process.processIdentifier)
    }

    registry.insert(managed)

    send(["id": id, "type": "spawn"])

    return [
      "id": id,
      "pid": Int(process.processIdentifier),
      "spawnfile": spec.originalFile,
      "spawnargs": [spec.originalFile] + spec.originalArgs,
    ]
  }
  #endif

  // MARK: - Sync spawn

  #if os(macOS)
  private func spawnProcessSync(_ config: [String: Any]) throws -> [String: Any] {
    let spec = try ProcessSpecification(config: config)
    let process = Process()

    let stdinPipe = spec.stdio[0] == "pipe" ? Pipe() : nil
    let stdoutPipe = spec.stdio[1] == "pipe" ? Pipe() : nil
    let stderrPipe = spec.stdio[2] == "pipe" ? Pipe() : nil

    let stdoutData = NSMutableData()
    let stderrData = NSMutableData()
    let stdoutLock = NSLock()
    let stderrLock = NSLock()

    process.executableURL = URL(fileURLWithPath: spec.executablePath)
    process.arguments = spec.arguments
    process.environment = spec.environment
    if let cwd = spec.cwd {
      process.currentDirectoryURL = URL(fileURLWithPath: cwd, isDirectory: true)
    }
    process.standardInput = makeStandardInput(for: spec.stdio[0], pipe: stdinPipe)
    process.standardOutput = makeStandardOutput(for: spec.stdio[1], pipe: stdoutPipe)
    process.standardError = makeStandardError(for: spec.stdio[2], pipe: stderrPipe)

    stdoutPipe?.fileHandleForReading.readabilityHandler = { handle in
      autoreleasepool {
        let data = handle.availableData
        if data.isEmpty {
          handle.readabilityHandler = nil
          return
        }
        stdoutLock.lock()
        stdoutData.append(data)
        stdoutLock.unlock()
      }
    }

    stderrPipe?.fileHandleForReading.readabilityHandler = { handle in
      autoreleasepool {
        let data = handle.availableData
        if data.isEmpty {
          handle.readabilityHandler = nil
          return
        }
        stderrLock.lock()
        stderrData.append(data)
        stderrLock.unlock()
      }
    }

    do {
      try process.run()
    } catch {
      return [
        "pid": 0,
        "status": NSNull(),
        "signal": NSNull(),
        "stdout": "",
        "stderr": "",
        "timedOut": false,
        "error": error.localizedDescription,
      ]
    }

    if spec.detached {
      _ = setpgid(process.processIdentifier, process.processIdentifier)
    }

    if let inputBase64 = config["inputBase64"] as? String,
      let inputData = Data(base64Encoded: inputBase64),
      let stdinPipe
    {
      stdinPipe.fileHandleForWriting.write(inputData)
    }
    try? stdinPipe?.fileHandleForWriting.close()

    let timeoutMs = config["timeoutMs"] as? Double
    let killSig = signalNumber(from: (config["killSignal"] as? String) ?? "SIGTERM")

    let group = DispatchGroup()
    group.enter()
    let originalTermHandler = process.terminationHandler
    process.terminationHandler = { proc in
      originalTermHandler?(proc)
      group.leave()
    }

    var timedOut = false
    if let timeoutMs, timeoutMs > 0 {
      let result = group.wait(timeout: .now() + .milliseconds(Int(timeoutMs)))
      if result == .timedOut {
        timedOut = true
        Darwin.kill(process.processIdentifier, killSig)
        _ = group.wait(timeout: .now() + .seconds(5))
      }
    } else {
      group.wait()
    }

    stdoutPipe?.fileHandleForReading.readabilityHandler = nil
    stderrPipe?.fileHandleForReading.readabilityHandler = nil

    // Read any remaining data
    if let stdoutPipe {
      let remaining = stdoutPipe.fileHandleForReading.readDataToEndOfFile()
      if !remaining.isEmpty {
        stdoutLock.lock()
        stdoutData.append(remaining)
        stdoutLock.unlock()
      }
    }
    if let stderrPipe {
      let remaining = stderrPipe.fileHandleForReading.readDataToEndOfFile()
      if !remaining.isEmpty {
        stderrLock.lock()
        stderrData.append(remaining)
        stderrLock.unlock()
      }
    }

    stdoutLock.lock()
    let finalStdout = Data(referencing: stdoutData)
    stdoutLock.unlock()
    stderrLock.lock()
    let finalStderr = Data(referencing: stderrData)
    stderrLock.unlock()

    let status: Any
    let signal: Any
    switch process.terminationReason {
    case .exit:
      status = Int(process.terminationStatus)
      signal = NSNull()
    case .uncaughtSignal:
      status = NSNull()
      signal = signalName(from: process.terminationStatus)
    @unknown default:
      status = NSNull()
      signal = NSNull()
    }

    return [
      "pid": Int(process.processIdentifier),
      "status": status,
      "signal": signal,
      "stdout": finalStdout.base64EncodedString(),
      "stderr": finalStderr.base64EncodedString(),
      "timedOut": timedOut,
    ]
  }
  #endif

  #if os(macOS)
  private func makeSendEvent() -> ([String: Any?]) -> Void {
    return { [weak self] payload in
      self?.sendEvent(childProcessEventName, payload)
    }
  }
  #endif
}
