import type * as Monaco from "monaco-editor";

import { loader } from "@monaco-editor/react";
import { memo, useEffect, useRef } from "react";

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

const viewStates = new Map<FileId, Monaco.editor.ICodeEditorViewState | null>();

export const EditorPane = memo(function EditorPane({
  file,
  theme,
  monacoOptions,
  editorDidMount,
  onChange,
  onEditorWillMount,
  onFocus,
}: EditorPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const lastAppliedValueRef = useRef(file.value);

  useEffect(() => {
    let isDisposed = false;
    const cancelable = loader.init();

    cancelable
      .then((monaco) => {
        if (isDisposed || !containerRef.current) return;

        monacoRef.current = monaco;
        onEditorWillMount(monaco);

        const modelUri = monaco.Uri.parse(`inmemory://rnd-fiddle/${file.id}`);
        const existingModel = monaco.editor.getModel(modelUri);
        const model =
          existingModel ?? monaco.editor.createModel(file.value, file.language, modelUri);

        if (existingModel) {
          if (existingModel.getValue() !== file.value) {
            existingModel.setValue(file.value);
          }
          monaco.editor.setModelLanguage(existingModel, file.language);
        }

        const editor = monaco.editor.create(containerRef.current, {
          automaticLayout: true,
          contextmenu: false,
          model,
          theme,
          ...monacoOptions,
        });

        const savedViewState = viewStates.get(file.id);
        if (savedViewState) {
          editor.restoreViewState(savedViewState);
        }

        const focusDisposable = editor.onDidFocusEditorText(() => {
          onFocus(file.id);
        });
        const changeDisposable = editor.onDidChangeModelContent(() => {
          const nextValue = editor.getValue();
          lastAppliedValueRef.current = nextValue;
          onChange?.(file.id, nextValue);
        });

        editorRef.current = editor;
        editorDidMount?.(file.id);

        if (savedViewState) {
          editor.focus();
        }

        if (isDisposed) {
          changeDisposable.dispose();
          focusDisposable.dispose();
          viewStates.set(file.id, editor.saveViewState());
          editor.dispose();
          editorRef.current = null;
        }
      })
      .catch((error) => {
        if (error?.type !== "cancelation") {
          console.error("Monaco initialization error:", error);
        }
      });

    return () => {
      isDisposed = true;
      cancelable.cancel();

      const editor = editorRef.current;
      if (editor) {
        viewStates.set(file.id, editor.saveViewState());
        editor.setModel(null);
        editor.dispose();
        editorRef.current = null;
      }
    };
  }, [editorDidMount, file.id, file.language, onChange, onEditorWillMount, onFocus, theme]);

  useEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model || lastAppliedValueRef.current === file.value) return;

    model.pushEditOperations(
      [],
      [{ range: model.getFullModelRange(), text: file.value }],
      () => null,
    );
    lastAppliedValueRef.current = file.value;
  }, [file.value]);

  useEffect(() => {
    editorRef.current?.updateOptions(monacoOptions);
  }, [monacoOptions]);

  return <div className="editorContainer" data-testid="editorContainer" ref={containerRef} />;
});
