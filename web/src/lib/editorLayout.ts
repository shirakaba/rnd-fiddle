export type FileId =
  | "main.js"
  | "renderer.js"
  | "preload.js"
  | "index.html"
  | "styles.css"
  | "package.json";

export interface EditorFile {
  id: FileId;
  label: string;
  language: "javascript" | "html" | "css" | "json";
  readOnly?: boolean;
  value: string;
}

export interface SplitNode {
  direction: "row" | "column";
  first: LayoutNode;
  second: LayoutNode;
}

export type LayoutNode = FileId | SplitNode;

export const editorOrder: FileId[] = [
  "main.js",
  "renderer.js",
  "index.html",
  "preload.js",
  "styles.css",
  "package.json",
];

export function compareEditors(a: FileId, b: FileId) {
  return editorOrder.indexOf(a) - editorOrder.indexOf(b);
}

export function createLayout(
  fileIds: FileId[],
  direction: "row" | "column" = "row",
): LayoutNode | null {
  if (fileIds.length === 0) {
    return null;
  }

  if (fileIds.length === 1) {
    return fileIds[0];
  }

  const secondHalf = [...fileIds];
  const firstHalf = secondHalf.splice(0, Math.floor(secondHalf.length / 2));

  return {
    direction,
    first: createLayout(firstHalf, "column")!,
    second: createLayout(secondHalf, "column")!,
  };
}

export function buildInitialFiles(): EditorFile[] {
  return [
    {
      id: "main.js",
      label: "Entrypoint",
      language: "javascript",
      value: `const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    backgroundColor: '#10161f',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
`,
    },
    {
      id: "renderer.js",
      label: "Renderer Process",
      language: "javascript",
      value:
        `const mount = document.querySelector('[data-role="app"]');

mount.innerHTML = ` +
        "`" +
        `<section class="hero">
  <p class="eyebrow">Electron Fiddle, remixed for the web</p>
  <h1>Multi-panel Monaco editor</h1>
  <p class="lede">
    This layout mirrors the desktop fiddle editor experience while staying
    idiomatic to React state and composition.
  </p>
  <button class="cta">Run experiment</button>
</section>` +
        "`" +
        `;
`,
    },
    {
      id: "index.html",
      label: "HTML",
      language: "html",
      value: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>rnd-fiddle</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <main data-role="app"></main>
    <script src="./renderer.js"></script>
  </body>
</html>
`,
    },
    {
      id: "preload.js",
      label: "Preload",
      language: "javascript",
      value: `const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('fiddle', {
  platform: process.platform,
  openedAt: new Date().toISOString(),
});
`,
    },
    {
      id: "styles.css",
      label: "Stylesheet",
      language: "css",
      value: `:root {
  color-scheme: dark;
  --bg: #091018;
  --panel: #101824;
  --panel-2: #172232;
  --line: rgba(255, 255, 255, 0.08);
  --text: #f3eee2;
  --muted: #9ca8b7;
  --accent: #f59e0b;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: 'Avenir Next', 'Segoe UI', sans-serif;
  background:
    radial-gradient(circle at top, rgba(245, 158, 11, 0.15), transparent 30%),
    linear-gradient(180deg, #091018 0%, #0c1420 100%);
  color: var(--text);
}

.hero {
  max-width: 48rem;
  margin: 8vh auto;
  padding: 3rem;
  border: 1px solid var(--line);
  border-radius: 1.5rem;
  background: rgba(16, 24, 36, 0.88);
  backdrop-filter: blur(18px);
}

.eyebrow {
  margin: 0 0 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--accent);
}

h1 {
  margin: 0;
  font-family: 'Iowan Old Style', 'Palatino Linotype', serif;
  font-size: clamp(3rem, 7vw, 5rem);
  line-height: 0.95;
}

.lede {
  color: var(--muted);
  font-size: 1.125rem;
}

.cta {
  border: 0;
  border-radius: 999px;
  padding: 0.9rem 1.3rem;
  font: inherit;
  font-weight: 700;
  background: var(--accent);
  color: #1a1206;
}
`,
    },
    {
      id: "package.json",
      label: "package.json",
      language: "json",
      readOnly: true,
      value: `{
  "name": "rnd-fiddle-playground",
  "private": true,
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  },
  "devDependencies": {
    "electron": "latest"
  }
}
`,
    },
  ];
}
