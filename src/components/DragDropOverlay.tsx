import React, { useState, useEffect, useCallback } from "react";
import { Upload } from "./Icons";
import { useRootStore } from "../stores";
import { useSplitViewStore } from "../stores/splitViewStore";
import { useModalStore } from "../stores/modalStore";
import { formatRegistry } from "../formats";
import { ImportExportService } from "../features/import-export/ImportExportService";

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

interface FileSystemEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
  file: (
    successCallback: (file: File) => void,
    errorCallback?: (error: Error) => void,
  ) => void;
  createReader: () => FileSystemDirectoryReader;
}

interface FileSystemFileEntry extends FileSystemEntry {
  isFile: true;
  isDirectory: false;
}

interface FileSystemDirectoryEntry extends FileSystemEntry {
  isFile: false;
  isDirectory: true;
}

interface FileSystemDirectoryReader {
  readEntries: (
    successCallback: (entries: FileSystemEntry[]) => void,
    errorCallback?: (error: Error) => void,
  ) => void;
}

const readAllDirectoryEntries = async (
  directoryEntry: FileSystemDirectoryEntry,
): Promise<File[]> => {
  const directoryReader = directoryEntry.createReader();
  const allEntries: FileSystemEntry[] = [];

  let currentBatch: FileSystemEntry[];
  do {
    currentBatch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      directoryReader.readEntries(resolve, reject);
    });
    allEntries.push(...currentBatch);
  } while (currentBatch.length > 0);

  const files: File[] = [];
  for (const entry of allEntries) {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      });
      files.push(file);
    } else if (entry.isDirectory) {
      files.push(
        ...(await readAllDirectoryEntries(entry as FileSystemDirectoryEntry)),
      );
    }
  }
  return files;
};

const detectLanguageFromFileName = (fileName: string): string => {
  if (!fileName) return "plaintext";

  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension) return "plaintext";

  // Try to find a matching language detector by its supported extensions
  const detector = formatRegistry
    .getAll()
    .find((detector) => detector.extensions.includes(extension));

  return detector?.id || "plaintext";
};

const handleWorkspaceImport = async (file: File): Promise<void> => {
  try {
    const service = new ImportExportService();
    const importResult = await service.importWorkspaces(file);

    if (importResult.errors.length > 0) {
      const errorMessage = importResult.errors.join("\n");
      alert(`Import encountered errors:\n${errorMessage}`);
    }

    if (importResult.importedWorkspaces.length > 0) {
      const importedCount = importResult.importedWorkspaces.length;
      alert(
        `Successfully imported ${importedCount} workspace${importedCount === 1 ? "" : "s"}! Reloading page...`,
      );
      window.location.reload();
    } else if (importResult.errors.length === 0) {
      alert(
        "No workspaces were imported. The file might have been empty or contained no new data.",
      );
    }
  } catch (error) {
    alert(
      `Import failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

const isCanvasDropZoneEvent = (
  event: Pick<DragEvent, "composedPath">,
): boolean =>
  event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLElement &&
        target.dataset.canvasDropZone === "true",
    );

const DragDropOverlay: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingDrop, setIsProcessingDrop] = useState(false); // Renamed from isUploading for clarity
  const { handleNewPopulatedTab } = useRootStore();
  const { splitView } = useSplitViewStore();
  const { isImportModalActive, isGlobalDragDropSuppressed } = useModalStore();

  const processDroppedItem = useCallback(async (item: DataTransferItem) => {
    const entry = item.webkitGetAsEntry() as FileSystemEntry | null;
    if (!entry) {
      // Some drag sources expose no filesystem entry; fall back to the plain file.
      const file = item.getAsFile();
      return file ? [file] : [];
    }

    if (entry.isFile) {
      return new Promise<File[]>((resolve, reject) => {
        (entry as FileSystemFileEntry).file((file) => resolve([file]), reject);
      });
    } else if (entry.isDirectory) {
      return readAllDirectoryEntries(entry as FileSystemDirectoryEntry);
    }
    return [];
  }, []);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      if (isCanvasDropZoneEvent(e)) {
        setIsDragging(false);
        return;
      }
      // Always prevent default to allow drops to work properly
      e.preventDefault();

      // If suppressed, don't show UI or process, but allow the event to work for local handlers
      if (isImportModalActive || isGlobalDragDropSuppressed) {
        return;
      }

      e.stopPropagation();

      if (e.dataTransfer) {
        // Check if any item is a file or directory
        let containsFilesOrFolders = false;
        if (e.dataTransfer.items) {
          for (let i = 0; i < e.dataTransfer.items.length; i++) {
            if (e.dataTransfer.items[i].kind === "file") {
              containsFilesOrFolders = true;
              break;
            }
          }
        } else if (e.dataTransfer.files.length > 0) {
          // Fallback for older browsers or different drop types
          containsFilesOrFolders = true;
        }

        if (containsFilesOrFolders) {
          setIsDragging(true);
        }
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (isCanvasDropZoneEvent(e)) {
        setIsDragging(false);
        return;
      }
      // Don't show UI if suppressed, but don't block the event
      if (isImportModalActive || isGlobalDragDropSuppressed) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (
        e.relatedTarget === null ||
        (e.relatedTarget as Node).nodeName === "HTML"
      ) {
        setIsDragging(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      if (isCanvasDropZoneEvent(e)) {
        setIsDragging(false);
        return;
      }
      // Always prevent default to allow drop to work
      e.preventDefault();

      // If suppressed, don't process the drop or stop propagation (let local handlers work)
      if (
        isImportModalActive ||
        isGlobalDragDropSuppressed ||
        !e.dataTransfer?.items
      ) {
        setIsDragging(false);
        return;
      }

      // Only stop propagation if we're actually processing the drop
      e.stopPropagation();
      setIsDragging(false);

      setIsProcessingDrop(true);
      const allFiles: File[] = [];

      try {
        const promises = [];
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          if (e.dataTransfer.items[i].kind === "file") {
            // Process only file kinds (which include directories via webkitGetAsEntry)
            promises.push(processDroppedItem(e.dataTransfer.items[i]));
          }
        }
        const results = await Promise.all(promises);
        results.forEach((fileList) => allFiles.push(...fileList));

        if (allFiles.length > 0) {
          // Check if any files are .scratch files
          const scratchFiles = allFiles.filter((file) =>
            file.name.endsWith(".scratch"),
          );
          const regularFiles = allFiles.filter(
            (file) => !file.name.endsWith(".scratch"),
          );

          // Handle .scratch files as workspace imports
          for (const scratchFile of scratchFiles) {
            try {
              await handleWorkspaceImport(scratchFile);
              // Only process one .scratch file at a time, then reload
              return;
            } catch (error) {
              console.error(
                `Error importing workspace from ${scratchFile.name}:`,
                error,
              );
            }
          }

          // Handle regular files as tab imports
          if (regularFiles.length > 0) {
            const toRightSide = splitView?.activeSide === "right" || false;
            for (const file of regularFiles) {
              try {
                const fileContent = file.type.startsWith("image/")
                  ? await readFileAsDataURL(file)
                  : await readFileAsText(file);
                const fileName = file.name.replace(/\.[^/.]+$/, ""); // Title without extension

                // Detect language from file extension
                const language = detectLanguageFromFileName(file.name);

                handleNewPopulatedTab(
                  {
                    id: crypto.randomUUID(),
                    title: fileName,
                    content: fileContent,
                    language: language,
                    languageLocked: language !== "plaintext", // Only lock if we detected a specific language
                    cursorPosition: { lineNumber: 1, column: 1 },
                    dateCreated: Date.now(),
                    lastModified: Date.now(),
                    workspaceId: "", // Empty string, will be handled by handleNewPopulatedTab
                  },
                  toRightSide,
                );
              } catch (fileReadError) {
                console.error(
                  `Error reading file ${file.name}:`,
                  fileReadError,
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("Error processing dropped items:", error);
      } finally {
        setIsProcessingDrop(false);
      }
    };

    // Capture phase: canvas zones stopPropagation during bubbling, so these
    // are the only handlers guaranteed to see drags over the canvas and hide
    // the "open in new tabs" popup.
    const hideOverlayOverCanvasZones = (e: DragEvent) => {
      if (isCanvasDropZoneEvent(e)) {
        setIsDragging(false);
      }
    };

    document.addEventListener("dragover", hideOverlayOverCanvasZones, true);
    document.addEventListener("dragleave", hideOverlayOverCanvasZones, true);
    document.addEventListener("drop", hideOverlayOverCanvasZones, true);

    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener(
        "dragover",
        hideOverlayOverCanvasZones,
        true,
      );
      document.removeEventListener(
        "dragleave",
        hideOverlayOverCanvasZones,
        true,
      );
      document.removeEventListener("drop", hideOverlayOverCanvasZones, true);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, [
    isImportModalActive,
    isGlobalDragDropSuppressed,
    handleNewPopulatedTab,
    splitView?.activeSide,
    processDroppedItem,
  ]);

  if (
    isImportModalActive ||
    isGlobalDragDropSuppressed ||
    (!isDragging && !isProcessingDrop)
  ) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-gray-800 border-2 border-dashed border-blue-500 rounded-lg p-8 max-w-md w-full text-center">
        {isProcessingDrop ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-200 text-lg font-medium">
              Processing dropped items...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload size={48} className="text-blue-400 mb-4" />
            <p className="text-gray-200 text-lg font-medium">
              Drop files or folders to open
            </p>
            <p className="text-gray-400 mt-2">
              Content will be opened in new tabs
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Drop .scratch files to import workspaces
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DragDropOverlay;
