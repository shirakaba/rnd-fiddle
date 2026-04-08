import ExpoModulesCore

public final class ExpoModuleSmokeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoModuleSmoke")

    Function("getMessage") { () -> String in
      #if os(macOS)
      return "Expo Module smoke test OK on macOS"
      #elseif os(iOS)
      return "Expo Module smoke test OK on iOS"
      #else
      return "Expo Module smoke test OK on Apple"
      #endif
    }
  }
}
