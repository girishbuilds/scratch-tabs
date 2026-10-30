import { act, renderHook } from "@testing-library/react";
import { useWelcomeActions } from "../useWelcomeActions";
import { useRootStore } from "../../../stores";
import { getJSONDemoContent } from "../utils/welcomeUtils";

jest.mock("../../../stores", () => ({
  useRootStore: jest.fn(),
}));

jest.mock("../../../features/import-export/ImportExportService", () => ({
  ImportExportService: jest.fn(),
}));

jest.mock("../utils/welcomeUtils", () => ({
  getJSONDemoContent: jest.fn(),
}));

describe("useWelcomeActions", () => {
  const handleNewTab = jest.fn();
  const handleNewPopulatedTab = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRootStore as unknown as jest.Mock).mockReturnValue({ handleNewTab, handleNewPopulatedTab });
  });

  it("creates an empty tab", () => {
    const { result } = renderHook(() => useWelcomeActions());

    act(() => result.current.createNewTab());

    expect(handleNewTab).toHaveBeenCalledWith(false);
  });

  it("opens the smart view demo with the demo content", async () => {
    (getJSONDemoContent as jest.Mock).mockResolvedValue('{"demo":true}');
    const { result } = renderHook(() => useWelcomeActions());

    await act(async () => result.current.openSmartViewDemo());

    expect(handleNewTab).toHaveBeenCalledWith(false, '{"demo":true}');
  });

  describe("pasteFromClipboard", () => {
    const setClipboard = (readText: jest.Mock) =>
      Object.defineProperty(navigator, "clipboard", { value: { readText }, configurable: true });

    it("opens a tab with the clipboard text", async () => {
      setClipboard(jest.fn().mockResolvedValue("pasted"));
      const { result } = renderHook(() => useWelcomeActions());

      await act(async () => result.current.pasteFromClipboard());

      expect(handleNewTab).toHaveBeenCalledWith(false, "pasted");
    });

    it("does nothing when the clipboard is empty", async () => {
      setClipboard(jest.fn().mockResolvedValue(""));
      const { result } = renderHook(() => useWelcomeActions());

      await act(async () => result.current.pasteFromClipboard());

      expect(handleNewTab).not.toHaveBeenCalled();
    });

    it("falls back to an empty tab when clipboard access is denied", async () => {
      jest.spyOn(console, "error").mockImplementation(() => undefined);
      setClipboard(jest.fn().mockRejectedValue(new Error("denied")));
      const { result } = renderHook(() => useWelcomeActions());

      await act(async () => result.current.pasteFromClipboard());

      expect(handleNewTab).toHaveBeenCalledWith(false);
    });
  });
});
