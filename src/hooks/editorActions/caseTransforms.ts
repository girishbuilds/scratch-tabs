import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import { guarded } from "./guard";

/**
 * Case transform entries surfaced in the editor context menu.
 *
 * Monaco's built-in transform commands operate on the current selection (or the
 * word at the cursor) and are undo-aware, so they are reused instead of
 * re-implementing the transformations.
 */
export const CASE_TRANSFORM_COMMANDS = [
  { id: "case-uppercase", label: "UPPERCASE", command: "editor.action.transformToUppercase" },
  { id: "case-lowercase", label: "lowercase", command: "editor.action.transformToLowercase" },
  { id: "case-titlecase", label: "Title Case", command: "editor.action.transformToTitlecase" },
  { id: "case-camelcase", label: "camelCase", command: "editor.action.transformToCamelcase" },
  { id: "case-pascalcase", label: "Pascal Case", command: "editor.action.transformToPascalcase" },
  { id: "case-snakecase", label: "snake_case", command: "editor.action.transformToSnakecase" },
  { id: "case-kebabcase", label: "kebab-case", command: "editor.action.transformToKebabcase" },
] as const;

/**
 * Runs a Monaco command by id.
 *
 * Some built-ins are exposed as editor actions (`editor.getAction`) while
 * others are only registered as commands, so fall back to `editor.trigger`
 * which resolves both.
 */
export const runMonacoCommand = (
  editor: Monaco.editor.IStandaloneCodeEditor,
  command: string,
) => {
  const action = editor.getAction?.(command);
  if (action) {
    action.run();
    return;
  }
  editor.trigger?.("editor-context-menu", command, null);
};

export const createCaseTransformActions =
  (): Monaco.editor.IActionDescriptor[] =>
    CASE_TRANSFORM_COMMANDS.map(({ id, label, command }, index) => ({
      id,
      label,
      contextMenuGroupId: "1_case",
      contextMenuOrder: index,
      precondition: "editorHasSelection",
      run: guarded(
        `run case transform ${command}`,
        (ed: Monaco.editor.ICodeEditor) =>
          runMonacoCommand(ed as Monaco.editor.IStandaloneCodeEditor, command),
      ),
    }));
