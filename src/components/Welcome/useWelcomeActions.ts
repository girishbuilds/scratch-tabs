import { useCallback } from "react";
import { useRootStore } from "../../stores";
import { ImportExportService } from "../../features/import-export/ImportExportService";
import { getJSONDemoContent } from "./utils/welcomeUtils";

/**
 * Handlers for the welcome screen's entry points (new tab, demo, paste,
 * open file, import workspace). Keeps WelcomeScreen purely compositional.
 */
export function useWelcomeActions() {
  const { handleNewTab, handleNewPopulatedTab } = useRootStore();

  const createNewTab = useCallback(() => {
    handleNewTab(false);
  }, [handleNewTab]);

  const openSmartViewDemo = useCallback(async () => {
    const content = await getJSONDemoContent();
    handleNewTab(false, content);
  }, [handleNewTab]);

  const pasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleNewTab(false, text);
      }
    } catch (error) {
      console.error("Failed to read from clipboard:", error);
      // Fallback: just create an empty tab
      handleNewTab(false);
    }
  }, [handleNewTab]);

  const openFile = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "*/*"; // Accept all file types
    input.style.display = "none";

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
            // Title without extension, matching tabs created by dropping a file
            handleNewPopulatedTab({
              title: file.name.replace(/\.[^/.]+$/, ""),
              content,
            });
          }
        };
        reader.readAsText(file);
      }
      // Clean up
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  }, [handleNewPopulatedTab]);

  const importWorkspace = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".scratch";
    input.style.display = "none";

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          // Check if it's a .scratch file
          if (!file.name.endsWith(".scratch")) {
            alert("Invalid file type. Please select a '.scratch' file.");
            return;
          }

          const service = new ImportExportService();
          const importResult = await service.importWorkspaces(file);

          if (importResult.errors.length > 0) {
            const errorMessage = importResult.errors.join("\n");
            alert(`Import encountered errors:\n${errorMessage}`);
          }

          if (importResult.importedWorkspaces.length > 0) {
            const importedCount = importResult.importedWorkspaces.length;
            alert(`Successfully imported ${importedCount} workspace${importedCount === 1 ? "" : "s"}! Reloading page...`);
            window.location.reload();
          } else if (importResult.errors.length === 0) {
            alert("No workspaces were imported. The file might have been empty or contained no new data.");
          }
        } catch (error) {
          alert(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      // Clean up
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  }, []);

  return { createNewTab, openSmartViewDemo, pasteFromClipboard, openFile, importWorkspace };
}
