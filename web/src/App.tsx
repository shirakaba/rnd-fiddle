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

const packageVersions = {
  react: ["19.1.0", "19.0.0", "18.3.1"],
  electron: ["35.0.0", "34.3.0", "33.2.1"],
  vite: ["8.0.1", "7.1.7", "6.4.5"],
};

function App() {
  const [files, setFiles] = useState<EditorFile[]>(() => buildInitialFiles());
  const [visibleIds, setVisibleIds] = useState<FileId[]>(initiallyVisible);
  const [activeId, setActiveId] = useState<FileId>("renderer.js");
  const [maximizedId, setMaximizedId] = useState<FileId | null>(null);

  const fileMap = useMemo(() => new Map(files.map((file) => [file.id, file] as const)), [files]);
  const sortedVisibleIds = useMemo(() => [...visibleIds].sort(compareEditors), [visibleIds]);
  const layout = useMemo(() => createLayout(sortedVisibleIds), [sortedVisibleIds]);
  const activeFile = fileMap.get(activeId) ?? files[0];

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
          setActiveId(next[0] ?? files[0]?.id ?? id);
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
        <div className="mosaic-tile" key={file.id}>
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
        </div>
      );
    }

    return (
      <div className="mosaic-root mosaic-root--nested">
        {renderNode(node.first)}
        <div className={`mosaic-split -${node.direction}`}>
          <div className="mosaic-split-line" />
        </div>
        {renderNode(node.second)}
      </div>
    );
  };

  return (
    <div className="mosaic-blueprint-theme app-frame">
      <div className="mosaic mosaic-drop-target app-mosaic">
        <div className="mosaic-root app-root">
          <div className="mosaic-tile app-sidebar-tile">
            <div className="mosaic-blueprint-theme mosaic mosaic-drop-target sidebar-mosaic">
              <div className="mosaic-root sidebar-root">
                <div className="mosaic-tile sidebar-section sidebar-section--editors">
                  <div className="fiddle-scrollbar">
                    <div className="bp3-tree">
                      <ul className="bp3-tree-node-list bp3-tree-root">
                        <li className="bp3-tree-node bp3-tree-node-expanded">
                          <div className="bp3-tree-node-content bp3-tree-node-content-0 bp3-tree-node-content--header">
                            <span className="bp3-tree-node-caret-none" />
                            <span
                              className="bp3-tree-node-icon bp3-tree-node-icon--folder"
                              aria-hidden="true"
                            />
                            <span className="bp3-tree-node-label">Editors</span>
                            <span className="bp3-tree-node-secondary-label">
                              <div className="bp3-button-group bp3-minimal toolbar-group">
                                <button
                                  type="button"
                                  className="bp3-button bp3-small"
                                  aria-label="Add editor"
                                >
                                  <span
                                    className="button-icon button-icon--add"
                                    aria-hidden="true"
                                  />
                                </button>
                                <button
                                  type="button"
                                  className="bp3-button bp3-small"
                                  aria-label="Grid layout"
                                >
                                  <span
                                    className="button-icon button-icon--grid"
                                    aria-hidden="true"
                                  />
                                </button>
                              </div>
                            </span>
                          </div>

                          <div className="bp3-collapse">
                            <div className="bp3-collapse-body" aria-hidden="false">
                              <ul className="bp3-tree-node-list">
                                {files.map((file) => {
                                  const isVisible = visibleIds.includes(file.id);
                                  const isActive = activeId === file.id;

                                  return (
                                    <li
                                      className={`bp3-tree-node ${isActive ? "bp3-tree-node-selected" : ""}`}
                                      key={file.id}
                                    >
                                      <div className="bp3-tree-node-content bp3-tree-node-content-1">
                                        <span className="bp3-tree-node-caret-none" />
                                        <span
                                          className="bp3-tree-node-icon bp3-tree-node-icon--document"
                                          aria-hidden="true"
                                        />
                                        <span className="bp3-tree-node-label">
                                          <button
                                            type="button"
                                            className="pointer bp3-context-menu2 file-link"
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
                                        </span>
                                        <span className="bp3-tree-node-secondary-label">
                                          <div className="bp3-button-group">
                                            <button
                                              type="button"
                                              className="bp3-button bp3-minimal file-toggle"
                                              onClick={() => toggleVisibility(file.id)}
                                              aria-label={isVisible ? "Hide file" : "Show file"}
                                            >
                                              <span
                                                className={`button-icon ${isVisible ? "button-icon--eye-open" : "button-icon--eye-off"}`}
                                                aria-hidden="true"
                                              />
                                            </button>
                                          </div>
                                        </span>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mosaic-split -column">
                  <div className="mosaic-split-line" />
                </div>

                <div className="mosaic-tile sidebar-section sidebar-section--packages">
                  <div className="package-tree">
                    <h5>Modules</h5>
                    <div className="bp3-input-group bp3-fill">
                      <input
                        type="text"
                        autoComplete="off"
                        placeholder="Search..."
                        className="bp3-input"
                      />
                    </div>
                    <div className="bp3-tree">
                      <ul className="bp3-tree-node-list bp3-tree-root">
                        {Object.entries(packageVersions).map(([pkg, versions]) => (
                          <li className="bp3-tree-node" key={pkg}>
                            <div className="bp3-tree-node-content bp3-tree-node-content-0">
                              <span className="bp3-tree-node-caret-none" />
                              <span className="bp3-tree-node-label">{pkg}</span>
                              <span className="bp3-tree-node-secondary-label package-tree-controls">
                                <select
                                  className="package-tree-version-select"
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
                                  <span
                                    className="button-icon button-icon--remove"
                                    aria-hidden="true"
                                  />
                                </button>
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mosaic-split -row app-root-split">
            <div className="mosaic-split-line" />
          </div>

          <div className="mosaic-tile app-workspace-tile">
            <div className={`focused__${activeFile.id} mosaic mosaic-drop-target`}>
              <div className="mosaic-root workspace-root">
                {maximizedId ? (
                  <div className="mosaic-tile mosaic-tile--full">
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
                  </div>
                ) : layout ? (
                  renderNode(layout)
                ) : (
                  <div className="mosaic-tile mosaic-tile--full">
                    <div className="workspace-empty">
                      <h4>No visible editors</h4>
                      <p>Use the left tree to reopen a file.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
