import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";

/**
 * Wraps a context menu handler so a failure is logged instead of surfacing as
 * an unhandled error inside Monaco's action runner.
 */
export const guarded =
  <TArgs extends unknown[]>(
    failure: string,
    handler: (...args: TArgs) => void,
  ) =>
  (...args: TArgs): void => {
    try {
      handler(...args);
    } catch (error) {
      console.warn(`[useEditorActions] Failed to ${failure}:`, error);
    }
  };

/** The editor's model, or null when there is none or it has been disposed. */
export const getLiveModel = (
  editor: Monaco.editor.ICodeEditor,
): Monaco.editor.ITextModel | null => {
  const model = editor.getModel();
  return model && !model.isDisposed() ? model : null;
};
