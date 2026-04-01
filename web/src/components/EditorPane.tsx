import type * as Monaco from "monaco-editor";

import Editor from "@monaco-editor/react";
import { memo } from "react";

import type { EditorFile, FileId } from "../lib/editorLayout";

interface EditorPaneProps {
  file: EditorFile;
  theme: string;
  monacoOptions: Monaco.editor.IEditorOptions;
  editorDidMount?: (id: FileId) => void;
  onChange?: (id: FileId, value: string | undefined) => void;
  onEditorWillMount: (monaco: typeof Monaco) => void;
  onFocus: (id: FileId) => void;
}

export const EditorPane = memo(function EditorPane({
  file,
  theme,
  monacoOptions,
  editorDidMount,
  onChange,
  onEditorWillMount,
  onFocus,
}: EditorPaneProps) {
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
        onChange={(value) => onChange?.(file.id, value)}
        onMount={(editor) => {
          editor.onDidFocusEditorText(() => onFocus(file.id));
          editorDidMount?.(file.id);
        }}
        options={monacoOptions}
        path={file.id}
        theme={theme}
        value={file.value}
      />
    </div>
  );
});
