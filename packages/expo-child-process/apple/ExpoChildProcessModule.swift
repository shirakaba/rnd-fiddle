import ExpoModulesCore
import Foundation

#if os(macOS)
import Darwin

private final class ManagedChildProcess {
  let id: String
  let process: Process
  let stdinPipe: Pipe?

  private let lock = NSLock()
  private var stdoutChunks: [String] = []
  private var stderrChunks: [String] = []
  private var exitCode: Int32?
  private var signal: String?

  init(id: String, process: Process, stdinPipe: Pipe?) {
    self.id = id
    self.process = process
    self.stdinPipe = stdinPipe
  }

  func appendStdout(_ data: Data) {
    lock.lock()
    stdoutChunks.append(data.base64EncodedString())
    lock.unlock()
  }

  func appendStderr(_ data: Data) {
    lock.lock()
    stderrChunks.append(data.base64EncodedString())
    lock.unlock()
  }

  func markExited() {
    lock.lock()
    exitCode = process.terminationReason == .exit ? process.terminationStatus : nil
    signal = process.terminationReason == .uncaughtSignal
      ? signalName(from: process.terminationStatus)
      : nil
    lock.unlock()
  }

  func pollState() -> [String: Any] {
    lock.lock()
    let stdout = stdoutChunks
    let stderr = stderrChunks
    stdoutChunks.removeAll(keepingCapacity: true)
    stderrChunks.removeAll(keepingCapacity: true)
    let exited = exitCode != nil || signal != nil || !process.isRunning
    let code = exitCode
    let signalName = signal
    lock.unlock()

    return [
      "exited": exited,
      "exitCode": code as Any,
      "signal": signalName as Any,
      "stdout": stdout,
      "stderr": stderr,
    ]
  }
}

private final class ChildProcessRegistry {
  static let shared = ChildProcessRegistry()

  private let lock = NSLock()
  private var processes: [String: ManagedChildProcess] = [:]

  func insert(_ process: ManagedChildProcess) {
    lock.lock()
    processes[process.id] = process
    lock.unlock()
  }

  func get(_ id: String) -> ManagedChildProcess? {
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
#endif

public final class ExpoChildProcessModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoChildProcess")

    Function("getMessage") { () -> String in
      #if os(macOS)
      return "Expo Child Process test OK on macOS"
      #elseif os(iOS)
      return "Expo Child Process test OK on iOS"
      #else
      return "Expo Child Process test OK on Apple"
      #endif
    }

    Function("getTestScriptPath") { () throws -> String in
      #if os(macOS)
      return try ensureTestScript()
      #else
      throw ChildProcessError.notImplemented("Test script is not available on iOS")
      #endif
    }

    Function("spawn") { (config: [String: Any]) throws -> [String: Any] in
      #if os(macOS)
      return try spawnProcess(config)
      #else
      throw ChildProcessError.notImplemented("Child processes are not implemented on iOS")
      #endif
    }

    Function("poll") { (id: String) throws -> [String: Any] in
      #if os(macOS)
      guard let managed = ChildProcessRegistry.shared.get(id) else {
        throw ChildProcessError.invalidProcess("Unknown child process id: \(id)")
      }
      return managed.pollState()
      #else
      throw ChildProcessError.notImplemented("Child processes are not implemented on iOS")
      #endif
    }

    Function("write") { (id: String, dataBase64: String) throws -> Bool in
      #if os(macOS)
      guard let managed = ChildProcessRegistry.shared.get(id),
        let stdinPipe = managed.stdinPipe,
        let data = Data(base64Encoded: dataBase64)
      else {
        throw ChildProcessError.invalidProcess("Unable to write to child process stdin")
      }
      stdinPipe.fileHandleForWriting.write(data)
      return true
      #else
      throw ChildProcessError.notImplemented("Child processes are not implemented on iOS")
      #endif
    }

    Function("closeStdin") { (id: String) throws -> Bool in
      #if os(macOS)
      guard let managed = ChildProcessRegistry.shared.get(id),
        let stdinPipe = managed.stdinPipe
      else {
        throw ChildProcessError.invalidProcess("Unable to close child process stdin")
      }
      try stdinPipe.fileHandleForWriting.close()
      return true
      #else
      throw ChildProcessError.notImplemented("Child processes are not implemented on iOS")
      #endif
    }

    Function("kill") { (id: String, signalName: String?) throws -> Bool in
      #if os(macOS)
      guard let managed = ChildProcessRegistry.shared.get(id) else {
        throw ChildProcessError.invalidProcess("Unknown child process id: \(id)")
      }
      let signalValue = signalNumber(from: signalName ?? "SIGTERM")
      if kill(managed.process.processIdentifier, signalValue) == 0 {
        return true
      }
      return false
      #else
      throw ChildProcessError.notImplemented("Child processes are not implemented on iOS")
      #endif
    }

    Function("cleanup") { (id: String) -> Bool in
      #if os(macOS)
      ChildProcessRegistry.shared.remove(id)
      return true
      #else
      return false
      #endif
    }

    Function("spawnSync") { (config: [String: Any]) throws -> [String: Any] in
      #if os(macOS)
      return try spawnProcessSync(config)
      #else
      throw ChildProcessError.notImplemented("Child processes are not implemented on iOS")
      #endif
    }
  }
}

private enum ChildProcessError: Error, CustomStringConvertible {
  case invalidArguments(String)
  case invalidProcess(String)
  case launchFailure(String)
  case notImplemented(String)

  var description: String {
    switch self {
    case .invalidArguments(let message),
      .invalidProcess(let message),
      .launchFailure(let message),
      .notImplemented(let message):
      return message
    }
  }
}

#if os(macOS)
private func spawnProcess(_ config: [String: Any]) throws -> [String: Any] {
  let specification = try ProcessSpecification(config: config)
  let process = Process()
  let stdinPipe = Pipe()
  let stdoutPipe = Pipe()
  let stderrPipe = Pipe()

  process.executableURL = URL(fileURLWithPath: specification.executablePath)
  process.arguments = specification.arguments
  process.environment = specification.environment
  if let cwd = specification.cwd {
    process.currentDirectoryURL = URL(fileURLWithPath: cwd, isDirectory: true)
  }
  process.standardInput = specification.stdio[0] == "pipe" ? stdinPipe : nil
  process.standardOutput = specification.stdio[1] == "pipe" ? stdoutPipe : nil
  process.standardError = specification.stdio[2] == "pipe" ? stderrPipe : nil

  let id = UUID().uuidString
  let managed = ManagedChildProcess(
    id: id,
    process: process,
    stdinPipe: specification.stdio[0] == "pipe" ? stdinPipe : nil
  )

  stdoutPipe.fileHandleForReading.readabilityHandler = { handle in
    let data = handle.availableData
    if data.isEmpty {
      handle.readabilityHandler = nil
      return
    }
    managed.appendStdout(data)
  }
  stderrPipe.fileHandleForReading.readabilityHandler = { handle in
    let data = handle.availableData
    if data.isEmpty {
      handle.readabilityHandler = nil
      return
    }
    managed.appendStderr(data)
  }

  process.terminationHandler = { process in
    managed.markExited()
    try? stdinPipe.fileHandleForWriting.close()
    try? stdoutPipe.fileHandleForReading.close()
    try? stderrPipe.fileHandleForReading.close()
    _ = process
  }

  do {
    try process.run()
  } catch {
    throw ChildProcessError.launchFailure("Failed to launch process: \(error)")
  }

  ChildProcessRegistry.shared.insert(managed)

  return [
    "id": id,
    "pid": Int(process.processIdentifier),
    "spawnargs": [specification.originalFile] + specification.originalArgs,
    "spawnfile": specification.originalFile,
  ]
}

private func spawnProcessSync(_ config: [String: Any]) throws -> [String: Any] {
  let specification = try ProcessSpecification(config: config)
  let process = Process()
  let stdinPipe = Pipe()
  let stdoutPipe = Pipe()
  let stderrPipe = Pipe()
  let stdoutData = NSMutableData()
  let stderrData = NSMutableData()
  let stdoutLock = NSLock()
  let stderrLock = NSLock()

  process.executableURL = URL(fileURLWithPath: specification.executablePath)
  process.arguments = specification.arguments
  process.environment = specification.environment
  if let cwd = specification.cwd {
    process.currentDirectoryURL = URL(fileURLWithPath: cwd, isDirectory: true)
  }
  process.standardInput = stdinPipe
  process.standardOutput = stdoutPipe
  process.standardError = stderrPipe

  stdoutPipe.fileHandleForReading.readabilityHandler = { handle in
    let data = handle.availableData
    if data.isEmpty {
      handle.readabilityHandler = nil
      return
    }
    stdoutLock.lock()
    stdoutData.append(data)
    stdoutLock.unlock()
  }
  stderrPipe.fileHandleForReading.readabilityHandler = { handle in
    let data = handle.availableData
    if data.isEmpty {
      handle.readabilityHandler = nil
      return
    }
    stderrLock.lock()
    stderrData.append(data)
    stderrLock.unlock()
  }

  do {
    try process.run()
  } catch {
    throw ChildProcessError.launchFailure("Failed to launch process: \(error)")
  }

  if let inputBase64 = config["inputBase64"] as? String,
    let input = Data(base64Encoded: inputBase64)
  {
    stdinPipe.fileHandleForWriting.write(input)
  }
  try stdinPipe.fileHandleForWriting.close()

  let timeoutMs = config["timeoutMs"] as? Double
  let semaphore = DispatchSemaphore(value: 0)
  DispatchQueue.global(qos: .userInitiated).async {
    process.waitUntilExit()
    semaphore.signal()
  }

  var timedOut = false
  if let timeoutMs, timeoutMs > 0 {
    let timeout = DispatchTime.now() + .milliseconds(Int(timeoutMs))
    if semaphore.wait(timeout: timeout) == .timedOut {
      timedOut = true
      kill(process.processIdentifier, signalNumber(from: "SIGTERM"))
      _ = semaphore.wait(timeout: .now() + .milliseconds(250))
    }
  } else {
    semaphore.wait()
  }

  stdoutPipe.fileHandleForReading.readabilityHandler = nil
  stderrPipe.fileHandleForReading.readabilityHandler = nil

  stdoutLock.lock()
  let finalStdout = Data(referencing: stdoutData)
  stdoutLock.unlock()
  stderrLock.lock()
  let finalStderr = Data(referencing: stderrData)
  stderrLock.unlock()

  return [
    "pid": Int(process.processIdentifier),
    "status": process.terminationReason == .exit ? Int(process.terminationStatus) : NSNull(),
    "signal": process.terminationReason == .uncaughtSignal
      ? signalName(from: process.terminationStatus) as Any
      : NSNull(),
    "stdout": finalStdout.base64EncodedString(),
    "stderr": finalStderr.base64EncodedString(),
    "timedOut": timedOut,
  ]
}

private struct ProcessSpecification {
  let executablePath: String
  let arguments: [String]
  let environment: [String: String]
  let cwd: String?
  let originalFile: String
  let originalArgs: [String]
  let stdio: [String]

  init(config: [String: Any]) throws {
    guard let file = config["file"] as? String else {
      throw ChildProcessError.invalidArguments("Missing child process file")
    }

    let args = config["args"] as? [String] ?? []
    let shellOption = config["shell"]
    let env = mergedEnvironment(from: config["env"] as? [String: Any])
    let cwd = config["cwd"] as? String
    let stdio = (config["stdio"] as? [String]) ?? ["pipe", "pipe", "pipe"]

    originalFile = file
    originalArgs = args
    self.cwd = cwd
    self.environment = env
    self.stdio = [
      stdio.count > 0 ? stdio[0] : "pipe",
      stdio.count > 1 ? stdio[1] : "pipe",
      stdio.count > 2 ? stdio[2] : "pipe",
    ]

    if let shellString = shellOption as? String {
      executablePath = shellString
      arguments = ["-lc", shellCommand(file: file, args: args)]
      return
    }

    if (shellOption as? Bool) == true {
      executablePath = env["SHELL"] ?? "/bin/sh"
      arguments = ["-lc", shellCommand(file: file, args: args)]
      return
    }

    executablePath = try resolveExecutable(file, env: env)
    arguments = args
  }
}

private func mergedEnvironment(from values: [String: Any]?) -> [String: String] {
  var environment = ProcessInfo.processInfo.environment
  for (key, value) in values ?? [:] {
    environment[key] = String(describing: value)
  }
  return environment
}

private func resolveExecutable(_ file: String, env: [String: String]) throws -> String {
  if file.contains("/") {
    return file
  }

  let pathEntries = (env["PATH"] ?? "").split(separator: ":")
  for entry in pathEntries {
    let candidate = URL(fileURLWithPath: String(entry)).appendingPathComponent(file).path
    if FileManager.default.isExecutableFile(atPath: candidate) {
      return candidate
    }
  }

  throw ChildProcessError.launchFailure("Executable not found in PATH: \(file)")
}

private func shellCommand(file: String, args: [String]) -> String {
  ([file] + args).map(shellEscape).joined(separator: " ")
}

private func shellEscape(_ value: String) -> String {
  if value.isEmpty {
    return "''"
  }
  return "'\(value.replacingOccurrences(of: "'", with: "'\\''"))'"
}

private func ensureTestScript() throws -> String {
  guard let bundledPath = Bundle.main.path(forResource: "expo-child-process-test", ofType: "sh") else {
    throw ChildProcessError.launchFailure("Bundled test script not found")
  }
  let destination = URL(fileURLWithPath: NSTemporaryDirectory())
    .appendingPathComponent("expo-child-process-test.sh")
  try? FileManager.default.removeItem(at: destination)
  try FileManager.default.copyItem(atPath: bundledPath, toPath: destination.path)
  try FileManager.default.setAttributes(
    [.posixPermissions: 0o755],
    ofItemAtPath: destination.path
  )
  return destination.path
}

private func signalNumber(from signal: String) -> Int32 {
  switch signal {
  case "SIGHUP":
    return SIGHUP
  case "SIGINT":
    return SIGINT
  case "SIGQUIT":
    return SIGQUIT
  case "SIGABRT":
    return SIGABRT
  case "SIGKILL":
    return SIGKILL
  case "SIGALRM":
    return SIGALRM
  case "SIGTERM":
    return SIGTERM
  default:
    return SIGTERM
  }
}

private func signalName(from signal: Int32) -> String {
  switch signal {
  case SIGHUP:
    return "SIGHUP"
  case SIGINT:
    return "SIGINT"
  case SIGQUIT:
    return "SIGQUIT"
  case SIGABRT:
    return "SIGABRT"
  case SIGKILL:
    return "SIGKILL"
  case SIGALRM:
    return "SIGALRM"
  case SIGTERM:
    return "SIGTERM"
  default:
    return "SIGTERM"
  }
}
#endif
