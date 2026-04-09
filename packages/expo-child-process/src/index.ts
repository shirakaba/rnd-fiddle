// Metro doesn't seem to do .macos.ts resolution upon a package.json exports
// entrypoint, so we re-export from lib(.macos).ts instead of using
// index(.macos).ts directly.
export * from "./lib";
