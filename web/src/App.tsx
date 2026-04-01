import {
  Button,
  ButtonGroup,
  ControlGroup,
  InputGroup,
  NonIdealState,
  Tree,
  type TreeNodeInfo,
} from "@blueprintjs/core";
import Editor from "@monaco-editor/react";
import classNames from "classnames";
import { useEffect, useMemo, useState } from "react";
import {
  Mosaic,
  MosaicWindow,
  createBalancedTreeFromLeaves,
  type LegacyMosaicNode,
  type MosaicNode,
  type MosaicPath,
  type MosaicWindowProps,
} from "react-mosaic-component";

import {
  buildInitialFiles,
  compareEditors,
  type EditorFile,
  type FileId,
} from "./lib/editorLayout";

type WrapperEditorId = "output" | "editors" | "sidebar";
type SidebarPaneId = "fileTree" | "packageManager";

type PackageRecord = {
  name: string;
  versions: string[];
};

const INITIAL_VISIBLE_EDITORS: FileId[] = ["renderer.js", "index.html", "preload.js", "styles.css"];
const WRAPPER_LAYOUT_WITH_CONSOLE: LegacyMosaicNode<WrapperEditorId> = {
  direction: "column",
  first: "output",
  second: {
    direction: "row",
    first: "sidebar",
    second: "editors",
    splitPercentage: 15,
  },
  splitPercentage: 25,
};
const WRAPPER_LAYOUT_WITHOUT_CONSOLE: LegacyMosaicNode<WrapperEditorId> = {
  direction: "column",
  first: "output",
  second: {
    direction: "row",
    first: "sidebar",
    second: "editors",
    splitPercentage: 15,
  },
  splitPercentage: 0,
};
const SIDEBAR_LAYOUT: LegacyMosaicNode<SidebarPaneId> = {
  direction: "column",
  first: "fileTree",
  second: "packageManager",
  splitPercentage: 50,
};
const AVAILABLE_VERSIONS = ["0.81.2", "0.81.1", "0.81.0", "0.80.0-rc.4"];
const INITIAL_PACKAGES: PackageRecord[] = [
  { name: "react", versions: ["19.1.0", "19.0.0", "18.3.1"] },
  { name: "react-native", versions: ["0.81.6", "0.81.2", "0.80.0"] },
  { name: "expo", versions: ["54.0.33", "54.0.20", "53.0.21"] },
];
const CONSOLE_OUTPUT = [
  "[10:24:18 AM] Starting React Native Fiddle...",
  "[10:24:18 AM] Using template react-native-fiddle-repro-0.81.2",
  "[10:24:19 AM] Ready. Press Run to launch the sample app.",
].join("\n");
const MAIN_EDITOR_THEME = "fiddle-main";
const OUTPUT_EDITOR_THEME = "fiddle-output";

function buildEditorTree(fileIds: FileId[]) {
  if (fileIds.length === 0) return null;
  return createBalancedTreeFromLeaves(
    [...fileIds].sort(compareEditors),
    "row",
  ) as MosaicNode<FileId>;
}

function getEditorTitle(id: FileId) {
  switch (id) {
    case "main.js":
      return "Main Process";
    case "renderer.js":
      return "Renderer Process";
    case "index.html":
      return "HTML";
    case "preload.js":
      return "Preload Script";
    case "styles.css":
      return "CSS";
    case "package.json":
      return "package.json";
  }
}

function App() {
  const [files, setFiles] = useState<EditorFile[]>(() => buildInitialFiles());
  const [visibleEditors, setVisibleEditors] = useState<FileId[]>(INITIAL_VISIBLE_EDITORS);
  const [focusedEditor, setFocusedEditor] = useState<FileId>("renderer.js");
  const [maximizedEditor, setMaximizedEditor] = useState<FileId | null>(null);
  const [editorLayout, setEditorLayout] = useState<MosaicNode<FileId> | null>(() =>
    buildEditorTree(INITIAL_VISIBLE_EDITORS),
  );
  const [version, setVersion] = useState(AVAILABLE_VERSIONS[0]);
  const [gistUrl, setGistUrl] = useState("");
  const [moduleQuery, setModuleQuery] = useState("");
  const [packages, setPackages] = useState(INITIAL_PACKAGES);
  const [isConsoleShowing, setIsConsoleShowing] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const fileMap = useMemo(() => new Map(files.map((file) => [file.id, file] as const)), [files]);
  const filteredPackageNames = useMemo(() => {
    const query = moduleQuery.trim().toLowerCase();
    if (!query) return [];

    return [
      "@react-native/assets-registry",
      "@react-navigation/native",
      "react-native-safe-area-context",
    ]
      .filter((name) => name.toLowerCase().includes(query))
      .slice(0, 5);
  }, [moduleQuery]);

  useEffect(() => {
    document.body.classList.add("fiddle");
    return () => {
      document.body.classList.remove("fiddle");
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => {
      setIsDarkTheme(event.matches);
    };

    setIsDarkTheme(mediaQuery.matches);
    mediaQuery.addEventListener("change", onChange);

    return () => {
      mediaQuery.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("bp3-dark", isDarkTheme);
  }, [isDarkTheme]);

  useEffect(() => {
    if (maximizedEditor) return;
    setEditorLayout(buildEditorTree(visibleEditors));
  }, [maximizedEditor, visibleEditors]);

  const hideEditor = (id: FileId) => {
    if (visibleEditors.length <= 1) return;

    const nextVisible = visibleEditors.filter((fileId) => fileId !== id);
    setVisibleEditors(nextVisible);

    if (focusedEditor === id && nextVisible[0]) {
      setFocusedEditor(nextVisible[0]);
    }

    if (maximizedEditor === id) {
      setMaximizedEditor(null);
    }
  };

  const toggleEditorVisibility = (id: FileId) => {
    setVisibleEditors((current) => {
      if (current.includes(id)) {
        if (current.length === 1) return current;
        return current.filter((fileId) => fileId !== id);
      }

      return [...current, id].sort(compareEditors);
    });
  };

  const resetEditorLayout = () => {
    const nextVisible = files
      .map((file) => file.id)
      .filter((id): id is FileId => id !== "package.json");
    setVisibleEditors(nextVisible);
    setFocusedEditor("main.js");
    setMaximizedEditor(null);
  };

  const updateFileValue = (id: FileId, value: string | undefined) => {
    setFiles((current) =>
      current.map((file) =>
        file.id === id && typeof value === "string" ? { ...file, value } : file,
      ),
    );
  };

  const setPackageVersion = (name: string, nextVersion: string) => {
    setPackages((current) =>
      current.map((entry) =>
        entry.name === name
          ? {
              ...entry,
              versions: [
                nextVersion,
                ...entry.versions.filter((versionItem) => versionItem !== nextVersion),
              ],
            }
          : entry,
      ),
    );
  };

  const removePackage = (name: string) => {
    setPackages((current) => current.filter((entry) => entry.name !== name));
  };

  const addPackage = (name: string) => {
    if (!name || packages.some((entry) => entry.name === name)) return;

    setPackages((current) => [{ name, versions: ["1.0.0"] }, ...current]);
    setModuleQuery("");
  };

  const fileTreeNodes: TreeNodeInfo[] = [
    {
      childNodes: files.map((file, index) => {
        const isVisible = visibleEditors.includes(file.id);

        return {
          id: index,
          hasCaret: false,
          icon: "document",
          isSelected: focusedEditor === file.id,
          label: (
            <span
              className="pointer"
              onClick={() => {
                if (!isVisible) toggleEditorVisibility(file.id);
                setFocusedEditor(file.id);
                setMaximizedEditor(null);
              }}
            >
              {file.id}
            </span>
          ),
          secondaryLabel: (
            <ButtonGroup>
              <Button
                minimal
                icon={isVisible ? "eye-open" : "eye-off"}
                onClick={() => toggleEditorVisibility(file.id)}
              />
            </ButtonGroup>
          ),
        } satisfies TreeNodeInfo;
      }),
      hasCaret: false,
      icon: "folder-open",
      id: "files",
      isExpanded: true,
      label: "Editors",
      secondaryLabel: (
        <ButtonGroup minimal style={{ display: "flex", gap: 4 }}>
          <Button small icon="add" />
          <Button small icon="grid-view" onClick={resetEditorLayout} />
        </ButtonGroup>
      ),
    },
  ];

  const moduleNodes: TreeNodeInfo[] = packages.map((entry) => ({
    id: entry.name,
    label: entry.name,
    secondaryLabel: (
      <div>
        <select
          className="package-tree-version-select"
          name={entry.name}
          onChange={(event) => setPackageVersion(entry.name, event.target.value)}
          value={entry.versions[0]}
        >
          {entry.versions.map((versionOption) => (
            <option key={versionOption}>{versionOption}</option>
          ))}
        </select>
        <Button minimal icon="remove" onClick={() => removePackage(entry.name)} />
      </div>
    ),
  }));

  const renderEditorToolbar = ({ title }: MosaicWindowProps<FileId>, id: FileId) => (
    <div role="toolbar">
      <div>
        <h5>{title}</h5>
      </div>
      <div />
      <div className="mosaic-controls">
        <Button className="bp3-small" icon="maximize" onClick={() => setMaximizedEditor(id)} />
        <Button className="bp3-small" icon="cross" onClick={() => hideEditor(id)} />
      </div>
    </div>
  );

  const renderEditorTile = (id: FileId, path: MosaicPath) => {
    const file = fileMap.get(id);
    if (!file) return <div />;

    return (
      <MosaicWindow<FileId>
        className={id}
        path={path}
        renderToolbar={(props) => renderEditorToolbar(props, id)}
        title={getEditorTitle(id)}
      >
        <div className="editorContainer">
          <Editor
            beforeMount={(monaco) => {
              monaco.editor.defineTheme(MAIN_EDITOR_THEME, {
                base: isDarkTheme ? "vs-dark" : "vs",
                inherit: true,
                rules: [{ token: "custom-date", foreground: "008800" }],
                colors: {
                  "editor.background": isDarkTheme ? "#2f3241" : "#fbfbfb",
                  "editor.foreground": isDarkTheme ? "#dcdcdc" : "#0e0e0e",
                  "editorLineNumber.foreground": isDarkTheme ? "#8a9ba8" : "#5f6b7c",
                  "editorLineNumber.activeForeground": isDarkTheme ? "#dcdcdc" : "#1e2527",
                  "editor.lineHighlightBorder": isDarkTheme ? "#3f4456" : "#d8dae2",
                  "editorCursor.foreground": isDarkTheme ? "#ffffff" : "#000000",
                },
              });
            }}
            className="editor"
            defaultLanguage={file.language}
            key={`${id}-${isDarkTheme ? "dark" : "light"}`}
            language={file.language}
            onChange={(value) => updateFileValue(id, value)}
            onMount={(editor) => {
              if (focusedEditor === id) editor.focus();
            }}
            options={{
              automaticLayout: true,
              minimap: { enabled: false },
              wordWrap: "on",
              fontSize: 12,
              readOnly: file.readOnly,
            }}
            path={id}
            theme={MAIN_EDITOR_THEME}
            value={file.value}
          />
        </div>
      </MosaicWindow>
    );
  };

  const editorsPane = maximizedEditor ? (
    <div className="mosaic">{renderEditorTile(maximizedEditor, [])}</div>
  ) : (
    <Mosaic<FileId>
      blueprintNamespace="bp3"
      className={`focused__${focusedEditor}`}
      onChange={setEditorLayout}
      renderTile={renderEditorTile}
      resize={{ minimumPaneSizePercentage: 15 }}
      value={editorLayout}
      zeroStateView={
        <NonIdealState
          action={<Button onClick={resetEditorLayout} text="Reset editors" />}
          description="You have closed all editors. You can open them again with the button below or in the sidebar menu!"
          icon="applications"
        />
      }
    />
  );

  const outputPane = (
    <div className="output" style={{ display: isConsoleShowing ? "inline-block" : "none" }}>
      <Editor
        beforeMount={(monaco) => {
          monaco.editor.defineTheme(OUTPUT_EDITOR_THEME, {
            base: isDarkTheme ? "vs-dark" : "vs",
            inherit: true,
            rules: [{ token: "custom-date", foreground: isDarkTheme ? "8ac7d6" : "5f6b7c" }],
            colors: {
              "editor.background": isDarkTheme ? "#1d2427" : "#d6dde0",
              "editor.foreground": isDarkTheme ? "#dcdcdc" : "#0e0e0e",
              "editorLineNumber.foreground": isDarkTheme ? "#8ac7d6" : "#5f6b7c",
              "editorLineNumber.activeForeground": isDarkTheme ? "#dcdcdc" : "#1e2527",
              "editor.lineHighlightBackground": isDarkTheme ? "#232b30" : "#dbe2e6",
              "editor.lineHighlightBorder": isDarkTheme ? "#232b30" : "#dbe2e6",
              "editorCursor.foreground": isDarkTheme ? "#ffffff" : "#000000",
            },
          });
          monaco.languages.register({ id: "consoleOutputLanguage" });
          monaco.languages.setMonarchTokensProvider("consoleOutputLanguage", {
            tokenizer: {
              root: [[/\[[^\]]+\]/, "custom-date"]],
            },
          });
        }}
        defaultLanguage="consoleOutputLanguage"
        key={`output-${isDarkTheme ? "dark" : "light"}`}
        language="consoleOutputLanguage"
        options={{
          automaticLayout: true,
          contextmenu: false,
          fontSize: 12,
          lineNumbersMinChars: 10,
          minimap: { enabled: false },
          readOnly: true,
          wordWrap: "on",
        }}
        theme={OUTPUT_EDITOR_THEME}
        value={CONSOLE_OUTPUT}
      />
    </div>
  );

  const sidebarPane = (
    <Mosaic<SidebarPaneId>
      blueprintNamespace="bp3"
      initialValue={SIDEBAR_LAYOUT}
      renderTile={(id) => {
        if (id === "fileTree") {
          return (
            <div className="fiddle-scrollbar">
              <Tree contents={fileTreeNodes} />
            </div>
          );
        }

        return (
          <div className="package-tree fiddle-scrollbar">
            <h5>Modules</h5>
            <InputGroup
              leftIcon="search"
              onChange={(event) => setModuleQuery(event.target.value)}
              placeholder="Search for modules here..."
              value={moduleQuery}
            />
            {filteredPackageNames.length > 0 ? (
              <div className="bp3-menu">
                {filteredPackageNames.map((name) => (
                  <button
                    key={name}
                    className="bp3-menu-item"
                    onClick={() => addPackage(name)}
                    type="button"
                  >
                    <span className="bp3-fill package-manager-result">{name}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <Tree contents={moduleNodes} />
          </div>
        );
      }}
    />
  );

  return (
    <div className="container">
      <header id="header">
        <div className={classNames("commands", "is-mac")}>
          <div>
            <ControlGroup fill={true} vertical={false}>
              <Button icon="cog" title="Setting" />
            </ControlGroup>
            <ControlGroup fill={true} vertical={false}>
              <Button
                id="version-chooser"
                icon="saved"
                onClick={() =>
                  setVersion(
                    (current) =>
                      AVAILABLE_VERSIONS[
                        (AVAILABLE_VERSIONS.indexOf(current) + 1) % AVAILABLE_VERSIONS.length
                      ],
                  )
                }
                text={version}
              />
              <Button icon="play" id="button-run" text="Run" />
            </ControlGroup>
            <ControlGroup fill={true} vertical={false}>
              <Button
                active={isConsoleShowing}
                icon="console"
                onClick={() => setIsConsoleShowing((current) => !current)}
                text="Console"
              />
            </ControlGroup>
          </div>
          <div className="title">rnd-fiddle</div>
          <div>
            <form
              aria-label="Enter Fiddle Gist URL"
              className={classNames("address-bar", { empty: !gistUrl })}
              onSubmit={(event) => event.preventDefault()}
            >
              <fieldset>
                <InputGroup
                  intent={
                    !gistUrl || /^https:\/\/gist\.github\.com\/.+$/.test(gistUrl)
                      ? undefined
                      : "danger"
                  }
                  leftIcon="geosearch"
                  onChange={(event) => setGistUrl(event.target.value)}
                  placeholder="https://gist.github.com/..."
                  rightElement={
                    <Button
                      disabled={!/^https:\/\/gist\.github\.com\/.+$/.test(gistUrl)}
                      icon="cloud-download"
                      text="Load Fiddle"
                    />
                  }
                  value={gistUrl}
                />
              </fieldset>
            </form>
            <ButtonGroup>
              <Button icon="share" text="Publish" />
            </ButtonGroup>
          </div>
        </div>
      </header>
      <Mosaic<WrapperEditorId>
        blueprintNamespace="bp3"
        initialValue={
          isConsoleShowing ? WRAPPER_LAYOUT_WITH_CONSOLE : WRAPPER_LAYOUT_WITHOUT_CONSOLE
        }
        key={isConsoleShowing ? "console-visible" : "console-hidden"}
        renderTile={(id) => {
          if (id === "output") return outputPane;
          if (id === "sidebar") return sidebarPane;
          return editorsPane;
        }}
        resize={{ minimumPaneSizePercentage: 15 }}
      />
    </div>
  );
}

export default App;
