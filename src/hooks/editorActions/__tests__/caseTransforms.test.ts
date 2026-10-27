import {
  CASE_TRANSFORM_COMMANDS,
  createCaseTransformActions,
  runMonacoCommand,
} from "../caseTransforms";

const editorWith = (overrides: Record<string, unknown>) =>
  overrides as never;

describe("runMonacoCommand", () => {
  it("runs the editor action when Monaco exposes one", () => {
    const run = jest.fn();
    const getAction = jest.fn(() => ({ run }));
    const trigger = jest.fn();

    runMonacoCommand(editorWith({ getAction, trigger }), "some.command");

    expect(getAction).toHaveBeenCalledWith("some.command");
    expect(run).toHaveBeenCalled();
    expect(trigger).not.toHaveBeenCalled();
  });

  it("falls back to triggering the command", () => {
    const trigger = jest.fn();

    runMonacoCommand(
      editorWith({ getAction: () => null, trigger }),
      "some.command",
    );

    expect(trigger).toHaveBeenCalledWith(
      "editor-context-menu",
      "some.command",
      null,
    );
  });

  it("does nothing when the editor can neither resolve nor trigger commands", () => {
    expect(() => runMonacoCommand(editorWith({}), "some.command")).not.toThrow();
  });
});

describe("createCaseTransformActions", () => {
  const actions = createCaseTransformActions();

  it("creates one selection-only action per case transform, in order", () => {
    expect(actions.map((action) => action.id)).toEqual(
      CASE_TRANSFORM_COMMANDS.map(({ id }) => id),
    );
    actions.forEach((action, index) => {
      expect(action).toMatchObject({
        contextMenuGroupId: "1_case",
        contextMenuOrder: index,
        precondition: "editorHasSelection",
      });
    });
  });

  it("uses the labels shown in the menu", () => {
    expect(actions.map((action) => action.label)).toEqual([
      "UPPERCASE",
      "lowercase",
      "Title Case",
      "camelCase",
      "Pascal Case",
      "snake_case",
      "kebab-case",
    ]);
  });

  it.each(CASE_TRANSFORM_COMMANDS)(
    "$id runs $command",
    ({ id, command }) => {
      const run = jest.fn();
      const editor = editorWith({ getAction: jest.fn(() => ({ run })) });

      actions.find((action) => action.id === id)!.run(editor);

      expect((editor as { getAction: jest.Mock }).getAction).toHaveBeenCalledWith(
        command,
      );
      expect(run).toHaveBeenCalled();
    },
  );

  it("logs instead of throwing when the command fails", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const editor = editorWith({
      getAction: () => {
        throw new Error("nope");
      },
    });

    expect(() => actions[0].run(editor)).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      "[useEditorActions] Failed to run case transform editor.action.transformToUppercase:",
      expect.any(Error),
    );
    warn.mockRestore();
  });
});
