import { getLiveModel, guarded } from "../guard";

describe("guarded", () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => warn.mockRestore());

  it("forwards its arguments to the handler", () => {
    const handler = jest.fn();

    guarded("do a thing", handler)("a", 2);

    expect(handler).toHaveBeenCalledWith("a", 2);
    expect(warn).not.toHaveBeenCalled();
  });

  it("logs a failure with the action name instead of throwing", () => {
    const error = new Error("boom");
    const run = guarded("do a thing", () => {
      throw error;
    });

    expect(() => run()).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      "[useEditorActions] Failed to do a thing:",
      error,
    );
  });
});

describe("getLiveModel", () => {
  const editorWith = (model: unknown) => ({ getModel: () => model }) as never;

  it("returns the model while it is alive", () => {
    const model = { isDisposed: () => false };

    expect(getLiveModel(editorWith(model))).toBe(model);
  });

  it("returns null for a disposed model", () => {
    expect(getLiveModel(editorWith({ isDisposed: () => true }))).toBeNull();
  });

  it("returns null when the editor has no model", () => {
    expect(getLiveModel(editorWith(null))).toBeNull();
  });
});
