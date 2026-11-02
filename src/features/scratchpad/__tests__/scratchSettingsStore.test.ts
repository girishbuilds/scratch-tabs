import { CLIPBOARD_CLEAR_MS, useScratchSettingsStore } from "../stores/scratchSettingsStore";

describe("scratchSettingsStore", () => {
  it("clears the clipboard after copying a secret by default", () => {
    expect(useScratchSettingsStore.getInitialState().clipboardAutoClear).toBe(true);
  });

  it("clears after 30 seconds", () => {
    expect(CLIPBOARD_CLEAR_MS).toBe(30_000);
  });

  it("toggles the setting and persists only preferences", () => {
    useScratchSettingsStore.getState().setClipboardAutoClear(false);
    expect(useScratchSettingsStore.getState().clipboardAutoClear).toBe(false);
    const stored = JSON.parse(localStorage.getItem("scratch-tabs-scratch-drawer-settings") ?? "{}");
    expect(stored.state.clipboardAutoClear).toBe(false);
    useScratchSettingsStore.getState().setClipboardAutoClear(true);
  });

  describe("drawer width", () => {
    afterEach(() => useScratchSettingsStore.setState({ drawerWidth: 380 }));

    it("defaults to 380px", () => {
      expect(useScratchSettingsStore.getInitialState().drawerWidth).toBe(380);
    });

    it("stores the chosen width, clamped to the limits", () => {
      Object.defineProperty(window, "innerWidth", { value: 2000, configurable: true });
      useScratchSettingsStore.getState().setDrawerWidth(500);
      expect(useScratchSettingsStore.getState().drawerWidth).toBe(500);
      useScratchSettingsStore.getState().setDrawerWidth(10);
      expect(useScratchSettingsStore.getState().drawerWidth).toBe(320);
      useScratchSettingsStore.getState().setDrawerWidth(5000);
      expect(useScratchSettingsStore.getState().drawerWidth).toBe(800);
    });
  });
});
