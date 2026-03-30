import { useMemo, useState, type ReactElement } from "react";

import { EditorPane } from "./components/EditorPane";
import {
  buildInitialFiles,
  compareEditors,
  createLayout,
  type EditorFile,
  type FileId,
  type LayoutNode,
} from "./lib/editorLayout";

const initiallyVisible: FileId[] = ["renderer.js", "index.html", "preload.js", "styles.css"];

function App() {
  const [files, setFiles] = useState<EditorFile[]>(() => buildInitialFiles());
  const [visibleIds, setVisibleIds] = useState<FileId[]>(initiallyVisible);
  const [activeId, setActiveId] = useState<FileId>("renderer.js");
  const [maximizedId, setMaximizedId] = useState<FileId | null>(null);

  const fileMap = useMemo(() => new Map(files.map((file) => [file.id, file] as const)), [files]);

  const sortedVisibleIds = useMemo(() => [...visibleIds].sort(compareEditors), [visibleIds]);

  const layout = useMemo(() => createLayout(sortedVisibleIds), [sortedVisibleIds]);

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

        if (activeId === id) {
          setActiveId(next[0] ?? id);
        }

        return next;
      }

      return [...current, id].sort(compareEditors);
    });
  };

  const hidePane = (id: FileId) => {
    if (visibleIds.length === 1) {
      return;
    }

    toggleVisibility(id);
  };

  const renderNode = (node: LayoutNode): ReactElement => {
    if (typeof node === "string") {
      const file = fileMap.get(node);
      if (!file) {
        return <></>;
      }

      return (
        <EditorPane
          key={file.id}
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
    }

    return (
      <div className={`split split--${node.direction}`}>
        {renderNode(node.first)}
        {renderNode(node.second)}
      </div>
    );
  };

  const activeFile = fileMap.get(activeId) ?? files[0];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <p className="sidebar__kicker">rnd-fiddle</p>
          <h1>Web Fiddle</h1>
          <p>A React-first take on Electron Fiddle’s multi-panel editor layout.</p>
        </div>

        <section className="sidebar__section">
          <div className="sidebar__section-heading">
            <span>Workspace files</span>
            <span>{visibleIds.length} visible</span>
          </div>

          <div className="file-list">
            {files.map((file) => {
              const isVisible = visibleIds.includes(file.id);
              const isActiveFile = activeId === file.id;

              return (
                <button
                  key={file.id}
                  type="button"
                  className={`file-row ${isVisible ? "file-row--visible" : ""} ${
                    isActiveFile ? "file-row--active" : ""
                  }`}
                  onClick={() => {
                    if (!isVisible) {
                      toggleVisibility(file.id);
                    }
                    setActiveId(file.id);
                    setMaximizedId(null);
                  }}
                >
                  <span>
                    <strong>{file.id}</strong>
                    <small>{file.label}</small>
                  </span>
                  <span className="file-row__meta">
                    {file.readOnly ? <em>RO</em> : null}
                    <i>{isVisible ? "Open" : "Hidden"}</i>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="sidebar__section sidebar__section--details">
          <div className="sidebar__section-heading">
            <span>Focused file</span>
            <span>{activeFile.language}</span>
          </div>
          <h2>{activeFile.id}</h2>
          <p>
            {activeFile.readOnly
              ? "This file is visible for inspection, but editing is disabled."
              : "Typing here updates only this pane, while layout remains independent from file state."}
          </p>
        </section>
      </aside>

      <main className="workspace">
        <header className="workspace__header">
          <div>
            <p className="workspace__eyebrow">Monaco mosaic</p>
            <h2>Alternating split layout, close/maximize controls, and focused file tracking.</h2>
          </div>
        </header>

        <section className="workspace__body">
          {maximizedId ? (
            <EditorPane
              file={fileMap.get(maximizedId)!}
              isActive={activeId === maximizedId}
              onChange={handleChange}
              onFocus={setActiveId}
              onHide={hidePane}
              onMaximize={setMaximizedId}
              onRestore={() => setMaximizedId(null)}
              isMaximized
            />
          ) : layout ? (
            renderNode(layout)
          ) : (
            <div className="workspace__empty">
              <h3>No files visible</h3>
              <p>Open a file from the left sidebar to bring a pane back into the workspace.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
