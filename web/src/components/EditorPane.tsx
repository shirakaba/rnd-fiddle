import Editor from "@monaco-editor/react";

import type { EditorFile, FileId } from "../lib/editorLayout";

interface EditorPaneProps {
  file: EditorFile;
  isActive: boolean;
  onChange: (id: FileId, value: string) => void;
  onFocus: (id: FileId) => void;
  onHide: (id: FileId) => void;
  onMaximize: (id: FileId) => void;
  onRestore: () => void;
  isMaximized: boolean;
}

export function EditorPane({
  file,
  isActive,
  onChange,
  onFocus,
  onHide,
  onMaximize,
  onRestore,
  isMaximized,
}: EditorPaneProps) {
  return (
    <section className={`pane ${isActive ? "pane--active" : ""}`}>
      <header className="pane__toolbar">
        <div>
          <p className="pane__eyebrow">{file.label}</p>
          <h2 className="pane__title">
            {file.id}
            {file.readOnly ? <span className="pane__badge">read-only</span> : null}
          </h2>
        </div>

        <div className="pane__actions">
          <button type="button" onClick={() => (isMaximized ? onRestore() : onMaximize(file.id))}>
            {isMaximized ? "Restore" : "Maximize"}
          </button>
          <button type="button" onClick={() => onHide(file.id)}>
            Hide
          </button>
        </div>
      </header>

      <div className="pane__editor" onFocusCapture={() => onFocus(file.id)}>
        <Editor
          height="100%"
          defaultLanguage={file.language}
          language={file.language}
          value={file.value}
          onChange={(value) => onChange(file.id, value ?? "")}
          onMount={(editor) => {
            editor.onDidFocusEditorText(() => onFocus(file.id));
          }}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            wordWrap: "on",
            fontSize: 14,
            fontFamily: "'SF Mono', 'Monaco', 'Cascadia Code', monospace",
            padding: { top: 16 },
            readOnly: file.readOnly,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            roundedSelection: true,
            tabSize: 2,
          }}
          theme="vs-dark"
        />
      </div>
    </section>
  );
}
