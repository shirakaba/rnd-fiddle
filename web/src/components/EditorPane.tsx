import type * as Monaco from "monaco-editor";

import Editor from "@monaco-editor/react";

import type { EditorFile, FileId } from "../lib/editorLayout";

interface EditorPaneProps {
  file: EditorFile;
  theme: string;
  onChange: (id: FileId, value: string | undefined) => void;
  onEditorWillMount: (monaco: typeof Monaco) => void;
  onFocus: (id: FileId) => void;
}

export function EditorPane({ file, theme, onChange, onEditorWillMount, onFocus }: EditorPaneProps) {
  return (
    <div
      className="editorContainer"
      data-testid="editorContainer"
      onFocusCapture={() => onFocus(file.id)}
    >
      <Editor
        beforeMount={onEditorWillMount}
        className="editor"
        defaultLanguage={file.language}
        language={file.language}
        onChange={(value) => onChange(file.id, value)}
        onMount={(editor) => {
          editor.onDidFocusEditorText(() => onFocus(file.id));
        }}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          wordWrap: "on",
          fontSize: 12,
          readOnly: file.readOnly,
        }}
        path={file.id}
        theme={theme}
        value={file.value}
      />
    </div>
  );
}
