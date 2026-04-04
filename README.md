# React Native Desktop Fiddle

A port of Electron Fiddle to React Native Desktop.

## Contributing

### Installation

```sh
# Install npm dependencies
bun install

# Install Cocoapods for the react-native-macos project
cd macos
pod install
cd ..
```

### Running

Running a debug build requires operating three terminals at once:

```sh
# Terminal 1 + 2:
# Open a tmux session with side-by-side panes for the native and web bundlers
node --run dev

# This works from the web workspace too:
cd web
node --run dev

# Terminal 1:
# Start the Metro bundler (on port 8081) for the React Native app
bun start

# Terminal 2:
# Start the Vite bundler (on port 5173) for the embedded web app
cd web
bun start

# Terminal 3 (in the root of the monorepo again):
# Build and run the react-native-macos app
bun macos
```

The `dev` command assumes `tmux` is already installed. It creates a `rnd-fiddle-dev` session with the repo root on the left and `web` on the right, so you can move focus between panes and send keypresses using normal `tmux` controls. In this dev session, `Ctrl+C` opens a small process-control menu with kill and restart actions for the current pane or both panes together. Re-running `node --run dev` will reattach to the existing session instead of starting duplicate bundlers.

You can access the embedded web app at http://localhost:5173 in a regular web browser, for limited (usually design-related) use-cases.
