# Embedding Bun

Try embedding Bun as a single-file executable with `BUN_BE_BUN=1`:

```sh
echo "console.log(\"you shouldn't see this\");" > such-bun.js
bun build --compile ./such-bun.js

# Without the env var, the executable runs its own entrypoint by default
./such-bun install

# With the env var, the executable acts like the `bun` CLI
BUN_BE_BUN=1 ./such-bun install
```
