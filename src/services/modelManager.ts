import * as Monaco from "monaco-editor/esm/vs/editor/editor.api";
import { Tab } from "../types";
import { useTabsStore } from "../stores/tabsStore";
import { useRootStore } from "../stores/rootStore";
import { StorageProviderFactory } from "../db";
import { isAmbiguousFormat, getPotentialFormatMatches } from "../formats";
import { updateCursorIndicator } from "../utils/testIndicators";
import { contentProcessingService } from "./contentProcessing";
import { getContentForLanguageDetection } from "../utils/formatDetectionUtils";
import { smartViewRegistry } from "../views/registry";
import { useCalloutStore } from "../stores/calloutStore";

// The maximum number of models to keep in memory
const MAX_MODELS = 10;

// Constants for language detection
const SIGNIFICANT_LENGTH_DIFFERENCE = 30;
const SIGNIFICANT_LINE_DIFFERENCE = 5;

class ModelManager {
  private monaco: typeof Monaco | null = null;
  private models = new Map<string, Monaco.editor.ITextModel>();
  private lru = new Set<string>(); // Simple Set acts as LRU list
  private listeners = new Map<string, Monaco.IDisposable>();
  private storage = StorageProviderFactory.getProvider();
  private contentFetchPromises = new Map<string, Promise<string>>(); // Prevent duplicate fetches
  private modelLoadPromises = new Map<string, Promise<Monaco.editor.ITextModel>>(); // Dedupe concurrent get() calls per tab
  private isPasteRef = new Map<string, boolean>(); // Track paste operations per tab
  private lastContent = new Map<string, string>(); // Track previous content for significant change detection
  private formatActionQueue = new Set<string>(); // Track pending format operations
  private cursorPositionListeners = new Map<string, Monaco.IDisposable>(); // Track cursor position listeners
  private debouncedCursorPersistence = new Map<string, NodeJS.Timeout>(); // Debounced cursor position saves
  private isProcessingContent = new Map<string, boolean>(); // Track content processing operations to prevent recursion
  private pasteFlagTimeouts = new Map<string, NodeJS.Timeout>(); // Timeout to clear paste flags

  public initialize(monacoInstance: typeof Monaco) {
    if (this.monaco) return;
    this.monaco = monacoInstance;
  }

  /**
   * Checks if tab content is available and valid for model creation
   */
  private isContentAvailable(tab: Tab): boolean {
    return tab.content !== undefined && tab.content !== null;
  }

  /**
   * Fetches tab content from database with deduplication
   */
  private async fetchContentFromDatabase(tabId: string): Promise<string> {
    // Check if we're already fetching this content
    const existingPromise = this.contentFetchPromises.get(tabId);
    if (existingPromise) {
      return existingPromise;
    }

    // Create new fetch promise
    const fetchPromise = this.storage
      .getTabContent(tabId)
      .then((content) => {
        return content || "";
      })
      .catch((error) => {
        console.error(
          `[ModelManager] ❌ Failed to fetch content from DB for tab ${tabId}:`,
          error,
        );
        return ""; // Return empty string as fallback
      })
      .finally(() => {
        // Clean up the promise from cache
        this.contentFetchPromises.delete(tabId);
      });

    // Cache the promise to prevent duplicate requests
    this.contentFetchPromises.set(tabId, fetchPromise);

    return fetchPromise;
  }

  /**
   * Process content using the new content processing framework
   */
  private async processContent(
    content: string,
    tabId: string,
    currentLanguage: string,
    languageLocked: boolean,
    isFromPaste: boolean,
    previousContent: string,
    isInitialContent: boolean = false,
    additionalFlags?: { isFromClipboardImport?: boolean }
  ): Promise<{ processed: boolean; content: string; language?: string }> {
    try {
      const context = contentProcessingService.createContext(
        tabId,
        currentLanguage,
        languageLocked,
        isFromPaste,
        previousContent,
        { isInitialContent, ...additionalFlags }
      );

      const result = await contentProcessingService.processContent(content, context);

      return {
        processed: result.processed,
        content: result.content,
        language: result.language
      };
    } catch (error) {
      console.warn('[ModelManager] Content processing failed:', error);
      return {
        processed: false,
        content,
        language: currentLanguage
      };
    }
  }

  /**
   * Applies processed content to the Monaco editor
   */
  private async applyProcessedContent(
    tabId: string,
    processingResult: { processed: boolean; content: string; language?: string },
    currentTab: { language: string },
    isFromPaste: boolean
  ): Promise<void> {
    const model = this.models.get(tabId);
    if (!model || model.isDisposed()) {
      return;
    }

    const editors = this.monaco?.editor.getEditors() || [];
    const editor = editors.find((e) => e.getModel() === model);

    if (editor) {
      this.isProcessingContent.set(tabId, true);

      editor.pushUndoStop();
      editor.executeEdits('content-processor', [{
        range: model.getFullModelRange(),
        text: processingResult.content,
        forceMoveMarkers: false,
      }]);
      editor.pushUndoStop();

      setTimeout(() => {
        this.isProcessingContent.delete(tabId);

        if (processingResult.language && processingResult.language !== currentTab.language) {
          useRootStore.getState().updateTabLanguage(tabId, processingResult.language, false);
          this.updateModelLanguage(tabId, processingResult.language);
        }

        if (isFromPaste && processingResult.language) {
          this.triggerAutoFormat(tabId, processingResult.language);
        }
      }, 50);
    }
  }

  /**
   * Determines if content is new and should be processed
   */
  private async isNewContent(tab: Tab, content: string): Promise<boolean> {
    if (!content || content.trim().length === 0) {
      return false;
    }

    const fetchedContent = await this.fetchContentFromDatabase(tab.id);
    return !fetchedContent || fetchedContent.trim().length === 0;
  }

  /**
   * Triggers initial content processing for new content
   */
  private scheduleInitialContentProcessing(tabId: string, content: string): void {
    setTimeout(async () => {
      try {
        // Pass true for isFromPaste so smart view callout can be triggered for clipboard-created tabs
        await this.handleLanguageDetection(tabId, content, "", true, true);
      } catch (error) {
        console.warn(`[ModelManager] Initial language detection failed for tab ${tabId}:`, error);
      }
    }, 10);
  }

  /**
   * Ensures tab has content, fetching from database if necessary
   */
  private async ensureTabContent(tab: Tab): Promise<Tab> {
    if (this.isContentAvailable(tab)) {
      return tab; // Content already available
    }

    try {
      const fetchedContent = await this.fetchContentFromDatabase(tab.id);

      // Update the store with fetched content to maintain consistency
      useTabsStore.getState().updateTabContent(tab.id, fetchedContent);

      // Return updated tab object
      return {
        ...tab,
        content: fetchedContent,
      };
    } catch (error) {
      console.error(
        `[ModelManager] Failed to ensure content for tab ${tab.id}:`,
        error,
      );

      // Return tab with empty content as fallback
      return {
        ...tab,
        content: "",
      };
    }
  }

  /**
   * Handles language detection and auto-formatting logic
   */
  private async handleLanguageDetection(
    tabId: string,
    newContent: string,
    prevContent: string,
    isFromPaste: boolean = false,
    isInitialContent: boolean = false,
  ) {
    try {
      // Clear the paste flag at the start of language detection
      if (isFromPaste) {
        this.isPasteRef.delete(tabId);

        // Clear the timeout since we consumed the flag
        const timeout = this.pasteFlagTimeouts.get(tabId);
        if (timeout) {
          clearTimeout(timeout);
          this.pasteFlagTimeouts.delete(tabId);
        }

      }
      const currentTab = useTabsStore
        .getState()
        .tabs.find((t) => t.id === tabId);

      if (!currentTab) {
        return;
      }

      // If language is locked and this is not initial content processing, skip language detection
      // This prevents manually set languages (like from Sample menu) from being overridden
      if (currentTab.languageLocked && !isInitialContent) {
        return;
      }

      const trimmedNewContent = newContent.trim();
      const trimmedOldContent = prevContent.trim();

      if (trimmedNewContent.length === 0) {
        if (currentTab.language !== "plaintext") {
          useRootStore.getState().updateTabLanguage(tabId, "plaintext", false);
        }
        return;
      }

      // Use the exact same method as StatusBar
      const contentForDetection = getContentForLanguageDetection(newContent);
      const potentialMatches = getPotentialFormatMatches(contentForDetection);
      const newDetectedLanguage = potentialMatches.length > 0 ? potentialMatches[0].id : "plaintext";

      const additionalFlags = isInitialContent ? { isFromClipboardImport: true } : undefined;

      // Use the newly detected language for content processing
      // This ensures processors (like JsonContentProcessor) receive the correct language context
      const processingResult = await this.processContent(
        newContent,
        tabId,
        newDetectedLanguage,
        currentTab.languageLocked,
        isFromPaste,
        prevContent,
        isInitialContent,
        additionalFlags
      );

      // Trigger smart view callout BEFORE early return
      // This ensures the callout shows even when content is successfully processed
      if (isFromPaste && !currentTab.smartViewIndicatorDismissed) {
        const languageToCheck = processingResult.language || newDetectedLanguage;
        const availableViews = smartViewRegistry.getViewsForLanguage(languageToCheck);
        if (availableViews.length > 0) {
          useCalloutStore.getState().showCallout(tabId, availableViews[0], languageToCheck);
        }
      }

      if (processingResult.processed) {
        await this.applyProcessedContent(tabId, processingResult, currentTab, isFromPaste);
        return;
      }

      // Determine if the change is significant
      const lengthDifference = Math.abs(
        trimmedNewContent.length - trimmedOldContent.length,
      );
      const newLines = trimmedNewContent.split("\n");
      const oldLines = trimmedOldContent.split("\n");
      const lineDifference = Math.abs(newLines.length - oldLines.length);

      const isSignificantChange =
        lengthDifference > SIGNIFICANT_LENGTH_DIFFERENCE ||
        lineDifference > SIGNIFICANT_LINE_DIFFERENCE ||
        (trimmedNewContent.length > 0 &&
          trimmedOldContent.length > 0 &&
          !trimmedNewContent.startsWith(trimmedOldContent.substring(0, 10)) &&
          !trimmedOldContent.startsWith(trimmedNewContent.substring(0, 10)) &&
          lengthDifference > 5);

      const newDetectionIsAmbiguous = isAmbiguousFormat(newContent);

      let shouldUpdate = false;
      let shouldTriggerAutoFormat = false;

      if (isSignificantChange) {
        if (newDetectedLanguage !== currentTab.language) {
          shouldUpdate = true;
          shouldTriggerAutoFormat = isFromPaste;
        }
      } else {
        if (newDetectedLanguage !== currentTab.language) {
          if (currentTab.language === "plaintext" || !newDetectionIsAmbiguous) {
            shouldUpdate = true;
          }
        }
      }

      // Don't overwrite an explicitly locked language even when detection disagrees.
      // Processors and the smart view callout above still ran; only the language
      // assignment is skipped here.
      if (shouldUpdate && !currentTab.languageLocked) {
        useRootStore
          .getState()
          .updateTabLanguage(tabId, newDetectedLanguage, false);

        if (shouldTriggerAutoFormat) {
          setTimeout(() => {
            this.triggerAutoFormat(tabId, newDetectedLanguage);
          }, 50);
        }
      }

      // NOTE: Smart view callout code has been moved earlier (before early return)
      // to fix Bug 2 - this section is no longer needed
    } catch (error) {
      console.warn(
        `[ModelManager] Failed to handle language detection for tab ${tabId}:`,
        error,
      );
    }
  }

  /**
   * Triggers auto-format for a specific tab
   */
  private triggerAutoFormat(tabId: string, language: string) {
    try {
      const model = this.models.get(tabId);
      if (!model || model.isDisposed()) return;

      // Prevent duplicate format operations
      const formatKey = `${tabId}-${language}`;
      if (this.formatActionQueue.has(formatKey)) return;

      this.formatActionQueue.add(formatKey);

      // Find the editor instance that has this model
      // This is a bit of a hack, but Monaco doesn't provide a direct way to get the editor from a model
      const editors = this.monaco?.editor.getEditors() || [];
      const editor = editors.find((e) => e.getModel() === model);

      if (editor) {
        const formatAction = editor.getAction("editor.action.formatDocument");
        if (formatAction) {
          formatAction.run().finally(() => {
            this.formatActionQueue.delete(formatKey);
          });
        } else {
          this.formatActionQueue.delete(formatKey);
        }
      } else {
        this.formatActionQueue.delete(formatKey);
      }
    } catch (error) {
      console.warn(
        `[ModelManager] Failed to trigger auto-format for tab ${tabId}:`,
        error,
      );
    }
  }

  /**
   * Handles debounced cursor position persistence
   */
  private debouncedSaveCursorPosition(
    tabId: string,
    cursorPosition: { lineNumber: number; column: number },
  ) {
    // Clear existing timeout for this tab
    const existingTimeout = this.debouncedCursorPersistence.get(tabId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new debounced timeout (save after 1 second of no cursor movement)
    const timeout = setTimeout(async () => {
      try {
        await this.storage.updateTabCursor(tabId, cursorPosition);

        // CRITICAL: Update the cursor position in the store so it's available for tab switching
        useTabsStore.getState().updateTabState(tabId, { cursorPosition });

        // Update DOM element for E2E tests to detect cursor position save completion
        updateCursorIndicator(cursorPosition.lineNumber);

        this.debouncedCursorPersistence.delete(tabId);
      } catch (error) {
        console.warn(
          `[ModelManager] Failed to persist cursor position for tab ${tabId}:`,
          error,
        );
      }
    }, 1000);

    this.debouncedCursorPersistence.set(tabId, timeout);
  }

  /**
   * Sets up cursor position listener for a model
   */
  private setupCursorPositionListener(
    tabId: string,
    editor: Monaco.editor.IStandaloneCodeEditor,
  ) {
    // Clean up existing listener
    this.cursorPositionListeners.get(tabId)?.dispose();

    const cursorListener = editor.onDidChangeCursorPosition(
      (e: Monaco.editor.ICursorPositionChangedEvent) => {
        try {
          // Only persist to database (debounced), don't update React state
          this.debouncedSaveCursorPosition(tabId, {
            lineNumber: e.position.lineNumber,
            column: e.position.column,
          });
        } catch (error) {
          console.warn(
            `[ModelManager] Failed to handle cursor position change for tab ${tabId}:`,
            error,
          );
        }
      },
    );

    this.cursorPositionListeners.set(tabId, cursorListener);
  }

  /**
   * Registers cursor position listening for an editor instance
   * Call this from EditorInstance when the editor is ready
   */
  public registerCursorPositionListener(
    tabId: string,
    editor: Monaco.editor.IStandaloneCodeEditor,
  ): void {
    this.setupCursorPositionListener(tabId, editor);
  }

  /**
   * Unregisters cursor position listening for a tab
   */
  public unregisterCursorPositionListener(tabId: string): void {
    // Clear any pending debounced save
    const existingTimeout = this.debouncedCursorPersistence.get(tabId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.debouncedCursorPersistence.delete(tabId);
    }

    // Dispose the cursor position listener
    this.cursorPositionListeners.get(tabId)?.dispose();
    this.cursorPositionListeners.delete(tabId);
  }

  private evict(keepTabId?: string) {
    if (this.models.size < MAX_MODELS) return;

    // Models an editor is displaying (e.g. the other pane of a split view)
    // must survive: disposing one blanks that editor, and LRU order is only
    // refreshed when an editor mounts, so a pane that stays on one tab ages.
    const shownModels = new Set<Monaco.editor.ITextModel>();
    for (const editor of this.monaco?.editor.getEditors?.() ?? []) {
      const model = editor.getModel();
      if (model) shownModels.add(model);
    }

    // Sets iterate in insertion order, so the first match is the oldest
    for (const tabId of this.lru) {
      if (tabId === keepTabId) continue;
      const model = this.models.get(tabId);
      if (model && shownModels.has(model)) continue;
      this.dispose(tabId);
      return;
    }
    // Every other model is on screen: stay over the limit rather than blank one.
  }

  public async get(tab: Tab, options?: { isNewTabFromPaste?: boolean }): Promise<Monaco.editor.ITextModel> {
    if (!this.monaco) {
      throw new Error("ModelManager not initialized");
    }

    // Overlapping calls for the same tab (e.g. an effect re-running while the first call is still
    // awaiting) must share one load. Otherwise the second call finds the first call's not-yet-registered
    // model by URI, disposes it, and the first caller is handed a disposed model.
    const inFlight = this.modelLoadPromises.get(tab.id);
    if (inFlight) {
      return inFlight;
    }

    const loadPromise = this.loadModel(tab, options).finally(() => {
      if (this.modelLoadPromises.get(tab.id) === loadPromise) {
        this.modelLoadPromises.delete(tab.id);
      }
    });
    this.modelLoadPromises.set(tab.id, loadPromise);
    return loadPromise;
  }

  private async loadModel(tab: Tab, options?: { isNewTabFromPaste?: boolean }): Promise<Monaco.editor.ITextModel> {
    if (!this.monaco) {
      throw new Error("ModelManager not initialized");
    }

    // Check if we have a cached model
    if (this.models.has(tab.id)) {
      const model = this.models.get(tab.id)!;
      if (!model.isDisposed()) {
        this.lru.delete(tab.id);
        this.lru.add(tab.id);
        return model;
      } else {
        this.models.delete(tab.id);
        this.lru.delete(tab.id);
        this.listeners.get(tab.id)?.dispose();
        this.listeners.delete(tab.id);
      }
    }

    // Read the freshest tab state from the store to avoid stale React closure content.
    // EditorInstance may mount with a slightly-behind activeTab if React commits the
    // smart-view-close transition before the Zustand subscription re-renders the component.
    const freshTab = useTabsStore.getState().tabs.find((t) => t.id === tab.id);
    const tabWithContent = await this.ensureTabContent(freshTab ?? tab);
    const content = tabWithContent.content || "";
    this.lastContent.set(tab.id, content); // Set initial content for comparison

    const modelUri = this.monaco.Uri.parse(`inmemory://model/${tab.id}`);
    const existingModel = this.monaco.editor.getModel(modelUri);
    if (existingModel) {
      existingModel.dispose();
    }

    const model = this.monaco.editor.createModel(
      content,
      tab.language,
      modelUri,
    );
    this.listeners.get(tab.id)?.dispose();

    const shouldProcessInitialContent = await this.isNewContent(tab, content) || options?.isNewTabFromPaste;

    if (shouldProcessInitialContent) {
      this.scheduleInitialContentProcessing(tab.id, content);
    }

    const contentListener = model.onDidChangeContent(() => {
      try {
        const newContent = model.getValue();
        const prevContent = this.lastContent.get(tab.id) || "";
        const wasFromPaste = this.isPasteRef.get(tab.id) || false;
        const isProcessingContent = this.isProcessingContent.get(tab.id) || false;


        // Don't clear the paste flag yet - let handleLanguageDetection consume it
        // This ensures the paste flag is available when we need to check for content processing

        // Update tab content in store
        useTabsStore.getState().updateTabContent(tab.id, newContent);
        this.lastContent.set(tab.id, newContent);

        // Skip language detection if we're in the middle of content processing
        if (isProcessingContent) {
          return;
        }

        // Handle language detection and auto-formatting
        this.handleLanguageDetection(
          tab.id,
          newContent,
          prevContent,
          wasFromPaste,
        ).catch(error => {
          console.warn(`[ModelManager] Language detection failed for tab ${tab.id}:`, error);
        });
      } catch (error) {
        console.warn(
          `[ModelManager] Failed to update content for tab ${tab.id}:`,
          error,
        );
      }
    });

    // Store the listener
    this.models.set(tab.id, model);
    this.listeners.set(tab.id, contentListener);
    this.lru.add(tab.id);
    if (this.models.size > MAX_MODELS) {
      this.evict(tab.id);
    }
    return model;
  }

  /**
   * Invalidates the cached model for a tab, forcing it to be recreated on next get()
   * Use this when tab content changes externally (e.g., from smart views)
   */
  public invalidateModel(tabId: string) {
    const model = this.models.get(tabId);
    if (model && !model.isDisposed()) {
      // Remove from cache so get() will create a new one
      this.models.delete(tabId);
      this.lru.delete(tabId);
      this.listeners.get(tabId)?.dispose();
      this.listeners.delete(tabId);
      this.lastContent.delete(tabId);
      this.isPasteRef.delete(tabId);
      this.isProcessingContent.delete(tabId);

      // Clean up paste flag timeout
      const timeout = this.pasteFlagTimeouts.get(tabId);
      if (timeout) {
        clearTimeout(timeout);
        this.pasteFlagTimeouts.delete(tabId);
      }

      // Dispose the model
      model.dispose();
    }
  }

  public dispose(tabId: string) {
    const model = this.models.get(tabId);
    if (model) {
      try {
        // Save final content before disposal if model is not disposed
        if (!model.isDisposed()) {
          const finalContent = model.getValue();
          useTabsStore.getState().updateTabContent(tabId, finalContent);
        }
      } catch (error) {
        console.warn(
          `[ModelManager] Failed to get final content for tab ${tabId}:`,
          error,
        );
      }

      this.listeners.get(tabId)?.dispose();
      this.listeners.delete(tabId);
      this.lastContent.delete(tabId); // Clean up content tracking
      this.isPasteRef.delete(tabId); // Clean up paste tracking
      this.isProcessingContent.delete(tabId); // Clean up content processing tracking

      // Clean up paste flag timeout
      const timeout = this.pasteFlagTimeouts.get(tabId);
      if (timeout) {
        clearTimeout(timeout);
        this.pasteFlagTimeouts.delete(tabId);
      }

      // Clean up cursor position listeners
      this.unregisterCursorPositionListener(tabId);

      try {
        model.dispose();
      } catch (error) {
        console.warn(
          `[ModelManager] Failed to dispose model for tab ${tabId}:`,
          error,
        );
      }
      this.models.delete(tabId);
      this.lru.delete(tabId);
    }
  }

  public disposeAll() {
    // Convert to array to avoid modification during iteration
    const tabIds = Array.from(this.models.keys());
    tabIds.forEach((tabId) => this.dispose(tabId));
  }

  // Helper methods for debugging
  public getDebugInfo() {
    return {
      modelCount: this.models.size,
      maxModels: MAX_MODELS,
      cachedTabs: Array.from(this.models.keys()),
      lruOrder: Array.from(this.lru),
    };
  }

  public getContent(tabId: string): string | undefined {
    const model = this.models.get(tabId);
    if (model && !model.isDisposed()) {
      return model.getValue();
    }
    return undefined;
  }

  public updateModelContent(tabId: string, content: string): void {
    const model = this.models.get(tabId);
    if (model && !model.isDisposed()) {
      try {
        model.setValue(content);
        // The onDidChangeContent listener will automatically sync this back to the store
      } catch (error) {
        console.warn(
          `[ModelManager] Failed to update model content for tab ${tabId}:`,
          error,
        );
      }
    }
  }

  public replaceModelContentWithUndo(tabId: string, content: string): void {
    const model = this.models.get(tabId);
    if (model && !model.isDisposed() && this.monaco) {
      try {
        // Find the editor instance that has this model
        const editors = this.monaco.editor.getEditors() || [];
        const editor = editors.find((e) => e.getModel() === model);

        if (editor) {
          // Use executeEdits to preserve undo stack
          editor.pushUndoStop();
          editor.executeEdits('sample-content', [{
            range: model.getFullModelRange(),
            text: content,
            forceMoveMarkers: false,
          }]);
          editor.pushUndoStop();
          // The onDidChangeContent listener will automatically sync this back to the store
        } else {
          // Fallback to setValue if no editor found
          model.setValue(content);
        }
      } catch (error) {
        console.warn(
          `[ModelManager] Failed to replace model content with undo for tab ${tabId}:`,
          error,
        );
      }
    }
  }

  public replaceModelRangeWithUndo(
    tabId: string,
    content: string,
    range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number },
  ): void {
    const model = this.models.get(tabId);
    if (model && !model.isDisposed() && this.monaco) {
      try {
        // Find the editor instance that has this model
        const editors = this.monaco.editor.getEditors() || [];
        const editor = editors.find((e) => e.getModel() === model);

        if (editor) {
          // Use executeEdits to preserve undo stack
          editor.pushUndoStop();
          editor.executeEdits("selection-transformation", [
            {
              range,
              text: content,
              forceMoveMarkers: false,
            },
          ]);
          editor.pushUndoStop();
          // The onDidChangeContent listener will automatically sync this back to the store
        } else {
          // Fallback to updating the model directly if no editor is found
          // This won't preserve selection but will update the data
          model.pushEditOperations(
            [],
            [
              {
                range,
                text: content,
              },
            ],
            () => null,
          );
        }
      } catch (error) {
        console.warn(
          `[ModelManager] Failed to replace model range with undo for tab ${tabId}:`,
          error,
        );
      }
    }
  }

  public updateModelLanguage(tabId: string, language: string): void {
    const model = this.models.get(tabId);
    if (model && !model.isDisposed() && this.monaco) {
      try {
        this.monaco.editor.setModelLanguage(model, language);
      } catch (error) {
        console.warn(
          `[ModelManager] ❌ Failed to update model language for tab ${tabId}:`,
          error,
        );
      }
    } else {
      console.warn(
        `[ModelManager] ⚠️ Cannot update model language for tab ${tabId}:`,
        {
          modelExists: !!model,
          modelDisposed: model?.isDisposed(),
          monacoInitialized: !!this.monaco,
        },
      );
    }
  }

  // Method to mark that the next content change for a tab is from a paste operation
  public markNextChangeAsPaste(tabId: string): void {

    // Clear any existing timeout
    const existingTimeout = this.pasteFlagTimeouts.get(tabId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    this.isPasteRef.set(tabId, true);

    // Set a timeout to clear the flag if it's not consumed within 500ms
    const timeout = setTimeout(() => {
      if (this.isPasteRef.has(tabId)) {
        this.isPasteRef.delete(tabId);
      }
      this.pasteFlagTimeouts.delete(tabId);
    }, 500);

    this.pasteFlagTimeouts.set(tabId, timeout);
  }
}

export const modelManager = new ModelManager();
