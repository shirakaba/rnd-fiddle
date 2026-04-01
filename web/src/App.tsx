import { useEffect, useMemo, useState } from "react";
import {
  Mosaic,
  createBalancedTreeFromLeaves,
  type LegacyMosaicNode,
  type MosaicNode,
} from "react-mosaic-component";

import { EditorPane } from "./components/EditorPane";
import {
  buildInitialFiles,
  compareEditors,
  type EditorFile,
  type FileId,
} from "./lib/editorLayout";

type ShellPaneId = "sidebar" | "workspace";
type SidebarPaneId = "editors" | "packages";

const initiallyVisible: FileId[] = ["renderer.js", "index.html", "preload.js", "styles.css"];

const initialShellLayout: LegacyMosaicNode<ShellPaneId> = {
  direction: "row",
  first: "sidebar",
  second: "workspace",
  splitPercentage: 18,
};

const initialSidebarLayout: LegacyMosaicNode<SidebarPaneId> = {
  direction: "column",
  first: "editors",
  second: "packages",
  splitPercentage: 56,
};

const packageVersions = {
  react: ["19.1.0", "19.0.0", "18.3.1"],
  electron: ["35.0.0", "34.3.0", "33.2.1"],
  vite: ["8.0.1", "7.1.7", "6.4.5"],
};

function buildEditorTree(fileIds: FileId[]) {
  return createBalancedTreeFromLeaves(fileIds, "row") as MosaicNode<FileId> | null;
}

function App() {
  const [files, setFiles] = useState<EditorFile[]>(() => buildInitialFiles());
  const [visibleIds, setVisibleIds] = useState<FileId[]>(initiallyVisible);
  const [activeId, setActiveId] = useState<FileId>("renderer.js");
  const [maximizedId, setMaximizedId] = useState<FileId | null>(null);
  const [shellLayout, setShellLayout] = useState(initialShellLayout);
  const [sidebarLayout, setSidebarLayout] = useState(initialSidebarLayout);
  const [editorLayout, setEditorLayout] = useState<MosaicNode<FileId> | null>(() =>
    buildEditorTree(initiallyVisible),
  );

  const fileMap = useMemo(() => new Map(files.map((file) => [file.id, file] as const)), [files]);
  const sortedVisibleIds = useMemo(() => [...visibleIds].sort(compareEditors), [visibleIds]);
  useEffect(() => {
    if (maximizedId) {
      return;
    }

    setEditorLayout(buildEditorTree(sortedVisibleIds));
  }, [maximizedId, sortedVisibleIds]);

  const handleChange = (id: FileId, value: string) => {
    setFiles((current) => current.map((file) => (file.id === id ? { ...file, value } : file)));
  };

  const toggleVisibility = (id: FileId) => {
    setVisibleIds((current) => {
      if (current.includes(id)) {
        const next = current.filter((fileId) => fileId !== id);

        if (maximizedId === id) {
          setMaximizedId(null);
        }

        if (activeId === id && next.length > 0) {
          setActiveId(next[0]);
        }

        return next;
      }

      return [...current, id].sort(compareEditors);
    });
  };

  const hidePane = (id: FileId) => {
    if (visibleIds.length <= 1) {
      return;
    }

    toggleVisibility(id);
  };

  const renderEditorTile = (id: FileId) => {
    const file = fileMap.get(id);
    if (!file) {
      return <div />;
    }

    return (
      <EditorPane
        file={file}
        isActive={activeId === file.id}
        onChange={handleChange}
        onFocus={setActiveId}
        onHide={hidePane}
        onMaximize={setMaximizedId}
        onRestore={() => setMaximizedId(null)}
        isMaximized={maximizedId === file.id}
      />
    );
  };

  const editorsPanel = (
    <section className="h-full overflow-hidden rounded-[8px] border border-[var(--border-color-1)] bg-[rgba(251,251,251,0.92)] shadow-[var(--editor-shadow)]">
      <div className="h-full overflow-auto px-3 py-3">
        <div className="mb-2 grid min-h-10 grid-cols-[12px_18px_minmax(0,1fr)_auto] items-center gap-2 rounded-[6px] border border-[#e1e7ea] bg-[linear-gradient(180deg,#f8fbfc,#eef4f7)] px-2">
          <span className="h-3 w-3" />
          <span className="bp3-tree-node-icon bp3-tree-node-icon--folder" aria-hidden="true" />
          <span className="truncate text-[13px] font-semibold text-[var(--text-color-2)]">
            Editors
          </span>
          <span className="flex items-center gap-1">
            <button type="button" className="bp3-button bp3-small" aria-label="Add editor">
              <span className="button-icon button-icon--add" aria-hidden="true" />
            </button>
            <button type="button" className="bp3-button bp3-small" aria-label="Grid layout">
              <span className="button-icon button-icon--grid" aria-hidden="true" />
            </button>
          </span>
        </div>

        <ul className="m-0 list-none p-0">
          {files.map((file) => {
            const isVisible = visibleIds.includes(file.id);
            const isActive = activeId === file.id;

            return (
              <li key={file.id} className="m-0">
                <div
                  className={[
                    "grid min-h-[34px] grid-cols-[12px_18px_minmax(0,1fr)_auto] items-center gap-2 rounded-[6px] px-2",
                    isActive ? "bg-[linear-gradient(180deg,#deedf9,#d1e5f4)]" : "",
                  ].join(" ")}
                >
                  <span className="h-3 w-3" />
                  <span
                    className="bp3-tree-node-icon bp3-tree-node-icon--document"
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    className="truncate border-0 bg-transparent p-0 text-left text-[13px] text-[var(--text-color-2)] hover:text-[#0b216f]"
                    onClick={() => {
                      if (!isVisible) {
                        toggleVisibility(file.id);
                      }
                      setActiveId(file.id);
                      setMaximizedId(null);
                    }}
                  >
                    {file.id}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="bp3-button bp3-minimal"
                      onClick={() => toggleVisibility(file.id)}
                      aria-label={isVisible ? "Hide file" : "Show file"}
                    >
                      <span
                        className={`button-icon ${isVisible ? "button-icon--eye-open" : "button-icon--eye-off"}`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );

  const packagesPanel = (
    <section className="h-full overflow-hidden rounded-[8px] border border-[var(--border-color-1)] bg-[rgba(251,251,251,0.92)] shadow-[var(--editor-shadow)]">
      <div className="flex h-full flex-col gap-2 overflow-auto px-3 py-3">
        <h5 className="m-0 text-[13px] leading-[1.3] font-semibold text-[var(--text-color-2)]">
          Modules
        </h5>
        <div>
          <input
            type="text"
            autoComplete="off"
            placeholder="Search..."
            className="h-8 w-full rounded-[6px] border border-[#cfd9de] bg-white px-[11px] text-[13px] text-[var(--text-color-1)] outline-none placeholder:text-[#83949c]"
          />
        </div>

        <ul className="m-0 list-none p-0">
          {Object.entries(packageVersions).map(([pkg, versions]) => (
            <li key={pkg} className="m-0">
              <div className="grid min-h-[34px] grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2 rounded-[6px] px-2">
                <span className="h-3 w-3" />
                <span className="truncate text-[13px] text-[var(--text-color-2)]">{pkg}</span>
                <span className="flex items-center gap-[6px]">
                  <select
                    className="h-7 max-w-32 rounded-[5px] border border-[#cfd9de] bg-white px-2 text-[12px] text-[var(--text-color-2)]"
                    name={pkg}
                    defaultValue={versions[0]}
                  >
                    {versions.map((version) => (
                      <option key={version}>{version}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="bp3-button bp3-minimal"
                    aria-label={`Remove ${pkg}`}
                  >
                    <span className="button-icon button-icon--remove" aria-hidden="true" />
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );

  const workspacePanel = maximizedId ? (
    <div className="h-full">{renderEditorTile(maximizedId)}</div>
  ) : editorLayout ? (
    <Mosaic<FileId>
      className="h-full w-full"
      blueprintNamespace="bp3"
      resize={{ minimumPaneSizePercentage: 18 }}
      value={editorLayout}
      onChange={(newNode) => setEditorLayout(newNode)}
      onRelease={(newNode) => setEditorLayout(newNode)}
      renderTile={(id) => renderEditorTile(id)}
      zeroStateView={<div />}
      mosaicId="editor-workspace"
    />
  ) : (
    <div className="grid h-full place-items-center rounded-[8px] border border-[var(--border-color-1)] bg-[rgba(251,251,251,0.92)] text-center text-[var(--foreground-3)] shadow-[var(--editor-shadow)]">
      <div>
        <h4 className="m-0 text-[13px] leading-[1.3] font-semibold">No visible editors</h4>
        <p className="mt-1 text-[13px]">Use the left tree to reopen a file.</p>
      </div>
    </div>
  );

  return (
    <div className="bg-white/30shadow-[0_22px_44px_rgba(37,110,128,0.08)] h-full overflow-hidden border border-white/60">
      <Mosaic<ShellPaneId>
        className="h-full w-full"
        blueprintNamespace="bp3"
        resize={{ minimumPaneSizePercentage: 12 }}
        value={shellLayout}
        onChange={(newNode) => {
          if (newNode) {
            setShellLayout(newNode as LegacyMosaicNode<ShellPaneId>);
          }
        }}
        onRelease={(newNode) => {
          if (newNode) {
            setShellLayout(newNode as LegacyMosaicNode<ShellPaneId>);
          }
        }}
        renderTile={(id) => {
          if (id === "sidebar") {
            return (
              <Mosaic<SidebarPaneId>
                className="h-full w-full"
                blueprintNamespace="bp3"
                resize={{ minimumPaneSizePercentage: 24 }}
                value={sidebarLayout}
                onChange={(newNode) => {
                  if (newNode) {
                    setSidebarLayout(newNode as LegacyMosaicNode<SidebarPaneId>);
                  }
                }}
                onRelease={(newNode) => {
                  if (newNode) {
                    setSidebarLayout(newNode as LegacyMosaicNode<SidebarPaneId>);
                  }
                }}
                renderTile={(sidebarId) => (sidebarId === "editors" ? editorsPanel : packagesPanel)}
                zeroStateView={<div />}
                mosaicId="sidebar-panels"
              />
            );
          }

          return <div className="h-full">{workspacePanel}</div>;
        }}
        zeroStateView={<div />}
        mosaicId="fiddle-shell"
      />
    </div>
  );
}

export default App;
