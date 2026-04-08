require "json"

package = JSON.parse(File.read(File.join(__dir__, "..", "package.json")))

Pod::Spec.new do |s|
  s.name = "ExpoChildProcess"
  s.version = package["version"]
  s.summary = "Expo module implementing Node.js child_process APIs on macOS."
  s.description = "Expo module implementing Node.js child_process APIs on macOS."
  s.license = "MIT"
  s.author = "Codex"
  s.homepage = "https://example.com/expo-child-process"
  s.platforms = { :osx => "14.0" }
  s.swift_version = "5.4"
  s.source = { git: "https://example.com/expo-child-process.git", tag: s.version.to_s }
  s.static_framework = true

  s.dependency "ExpoModulesCore"

  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
