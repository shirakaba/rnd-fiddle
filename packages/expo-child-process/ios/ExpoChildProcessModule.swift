import ExpoModulesCore

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
  }
}
