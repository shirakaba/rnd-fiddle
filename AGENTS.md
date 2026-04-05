# React Native (Desktop) Fiddle

A React Native Desktop-based IDE app for running simple demos of React Native Desktop. It's inspired by [Electron Fiddle](https://github.com/electron/fiddle). This repo is the continuation of a previous work, [react-native-fiddle](https://github.com/shirakaba/react-native-fiddle), which forked Electron Fiddle, using the Electron-based IDE largely as-is, but adapting it to run React Native Desktop clients instead. In this repo, we go a step further to port even the Electron parts to React Native Desktop. Instead of using native views, though, we embed a web view that connects to a React Vite web app, allowing us to reuse the indispensable Monaco editor and mirror the original UI design.

## References

You'll find a checkout of the above-mentioned `react-native-fiddle` at `../fiddle-electron`, which should be referenced. No need to refer to the original Electron Fiddle, though.

## Repo layout

This is a standard Expo development build, with a `react-native-macos` app added into it, following [best practices](https://microsoft.github.io/react-native-macos/docs/guides/installing-expo-modules) to integrate Expo. Although there may be `ios`/`android` folders present as part of our starter boilerplate, we have no intentions to implement mobile apps.

```
.
├── AGENTS.md
├── App.tsx
├── README.md
├── TODO.md
├── app.json                              # The Expo app.json file, which we
│                                         # largely cannot use due to limited
│                                         # Expo support for react-native-macos
├── assets
├── babel.config.js
├── bun.lock
├── index.ts                              # The React Native app entrypoint
├── ios
├── macos                                 # The React Native macOS app
├── metro.config.js
├── node_modules
├── package.json
├── patches
│   ├── @blueprintjs%2Fcore@3.54.0.patch  # Stop Blueprint using invalid CSS
│   └── expo-modules-core@3.0.29.patch    # Make EMC build on React Native macOS
├── scripts
├── tsconfig.json
└── web                                   # The React Vite embedded web app
```

## Installation

```sh
# Install npm dependencies
bun install

# Install Cocoapods for the react-native-macos project
pod install --project-directory=macos
```

## Running

### Running the React Native macOS app

The React Native macOS app needs to connect to both Metro and Vite. To allow multiple agents to develop in parallel without clashing ports, we have a dev script that uses `tmux` to run both Metro and Vite at once, with a given port offset:

```sh
# Use the port offset instructed to you in the session (or ask for one if you
# haven't been told one yet).
PORT_OFFSET=1
node --run dev -- $PORT_OFFSET
```

The dev script is a three-pane view:

1. Metro (on http://localhost:8082, given `PORT_OFFSET=1`)
2. Vite (on http://localhost:5174, given `PORT_OFFSET=1`).
3. Spare terminal for building-and-running the macOS app if needed, with the command `node --run macos -- $PORT_OFFSET` ready-typed-out (which, if run, will launch the app so that it auto-connects to Metro and Vite on the appropriate ports).

When focused on panes 1 or 2, you can interact with them as you'd normally interact with Metro or Vite. The main difference is that sending `Ctrl+C` brings up the `Process Control` menu, which gives several options:

- `Back`
- `Kill <currently-focused bundler>`, e.g. `Kill Metro` if focused on pane 1.
- `Kill <not-currently-focused bundler>`, e.g. `Kill Vite` if focused on pane 1.
- `Kill Metro and Vite`
- `Restart <currently-focused bundler>`, e.g. `Restart Metro` if focused on pane 1.
- `Restart <not-currently-focused bundler>`, e.g. `Restart Vite` if focused on pane 1.

When focused on pane 3, `Ctrl-C` behaves much as `Ctrl-C` normally would (it does not bring up the `Process Control` menu).

The session will close once all three panels are no longer actively running a process.

To verify any UI work, you can connect to the Vite address via the Chrome DevTools MCP server.

### Running just the embedded web app

If you're just doing UI work, you may be able to simplify things by just running the embedded web app:

```sh
PORT_OFFSET=1
VITE_PORT=$((5173 + PORT_OFFSET))
cd web
node --run start -- $PORT_OFFSET
```

This runs the React Vite app on http://localhost:5174. You can develop it just like a regular web app by connecting to that address via the Chrome DevTools MCP server.

## Developing

After any change, run the formatting:

```sh
# From the base of the monorepo:

# 1. Run the formatting
node --run format

# 2. Run the typecheck
# (If you only touched web code, you can just
# run `node --run typecheck:web` instead)
node --run typecheck
```
