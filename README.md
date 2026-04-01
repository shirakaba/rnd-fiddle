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

You can access the embedded web app at http://localhost:5173 in a regular web browser, for limited (usually design-related) use-cases.
