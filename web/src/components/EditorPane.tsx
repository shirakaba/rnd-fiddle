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
    <div className={`mosaic-window mosaic-drop-target ${file.id} ${isActive ? "is-active" : ""}`}>
      <div className="mosaic-window-toolbar">
        <div role="toolbar" className="mosaic-window-toolbar__content">
          <div>
            <h5 className="mosaic-toolbar-severity-level-1">{file.label}</h5>
          </div>
          <div className="mosaic-window-toolbar__meta">{file.id}</div>
          <div className="mosaic-controls">
            <button
              type="button"
              className="bp3-button bp3-small"
              onClick={() => (isMaximized ? onRestore() : onMaximize(file.id))}
              aria-label={isMaximized ? "Restore pane" : "Maximize pane"}
            >
              <span
                className={`button-icon ${isMaximized ? "button-icon--restore" : "button-icon--maximize"}`}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              className="bp3-button bp3-small"
              onClick={() => onHide(file.id)}
              aria-label="Close pane"
            >
              <span className="button-icon button-icon--close" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="mosaic-window-body">
        <div
          className="editorContainer"
          data-testid="editorContainer"
          onFocusCapture={() => onFocus(file.id)}
        >
          <Editor
            height="100%"
            defaultLanguage={file.language}
            language={file.language}
            value={file.value}
            onChange={(value) => onChange(file.id, value ?? "")}
            onMount={(editor, monaco) => {
              monaco.editor.defineTheme("fiddle-vs", {
                base: "vs",
                inherit: true,
                rules: [
                  { token: "comment", foreground: "008000" },
                  { token: "keyword", foreground: "0000ff" },
                  { token: "string", foreground: "a31515" },
                  { token: "identifier", foreground: "000000" },
                  { token: "type.identifier", foreground: "008080" },
                ],
                colors: {
                  "editor.background": "#fffffe",
                  "editorLineNumber.foreground": "#237893",
                  "editorLineNumber.activeForeground": "#0b216f",
                  "editor.lineHighlightBorder": "#eeeeee",
                  "editor.lineHighlightBackground": "#00000000",
                  "editor.selectionBackground": "#add6ff",
                  "editor.inactiveSelectionBackground": "#e5ebf1",
                  "editorCursor.foreground": "#000000",
                  "editorIndentGuide.background1": "#d3d3d3",
                  "editorIndentGuide.activeBackground1": "#939393",
                  "editorBracketMatch.background": "#0064001a",
                  "editorBracketMatch.border": "#b9b9b9",
                },
              });

              monaco.editor.setTheme("fiddle-vs");
              editor.onDidFocusEditorText(() => onFocus(file.id));
            }}
            options={{
              automaticLayout: true,
              minimap: { enabled: false },
              fontSize: 12,
              lineHeight: 18,
              fontFamily: "Menlo, Monaco, 'Courier New', monospace",
              padding: { top: 0 },
              readOnly: file.readOnly,
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              roundedSelection: false,
              tabSize: 2,
              renderLineHighlight: "line",
              wordWrap: "off",
            }}
            theme="fiddle-vs"
          />
        </div>
      </div>

      <div className="mosaic-window-body-overlay" />
      <div className="mosaic-window-additional-actions-bar" />
    </div>
  );
}
