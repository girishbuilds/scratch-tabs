import React, { useRef, useEffect, useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import { useRootStore } from "../../stores";
import { ToolSelectorModal } from "../ToolSelector";
import { toolService, ToolItem } from "../../services/toolService";
import { TabActions } from "../Tab/TabActions";
import { FileText, Extension, Upload, File, Package, FileJson, Lock, Database, Globe } from "../Icons";
import { ImportExportService } from "../../features/import-export/ImportExportService";
import { getJSONDemoContent } from "./utils/welcomeUtils";
import type { LucideProps } from "lucide-react";

/** HeroActionCard - Enhanced action card for primary welcome actions. */
interface HeroActionCardProps {
  icon: React.ComponentType<LucideProps>;
  title: string;
  description: string;
  hint: string;
  onClick: () => void;
  colorScheme: 'primary' | 'info' | 'warning';
}

const colorSchemeMap: Record<'primary' | 'info' | 'warning', {
  border: string;
  hoverBorder: string;
  iconBg: string;
  iconHoverBg: string;
  iconColor: string;
}> = {
  primary: {
    border: "border-primary/30",
    hoverBorder: "hover:border-primary/50",
    iconBg: "bg-primary/10",
    iconHoverBg: "group-hover:bg-primary/20",
    iconColor: "text-primary",
  },
  info: {
    border: "border-info/30",
    hoverBorder: "hover:border-info/50",
    iconBg: "bg-info/10",
    iconHoverBg: "group-hover:bg-info/20",
    iconColor: "text-info",
  },
  warning: {
    border: "border-warning/30",
    hoverBorder: "hover:border-warning/50",
    iconBg: "bg-warning/10",
    iconHoverBg: "group-hover:bg-warning/20",
    iconColor: "text-warning",
  },
};

const HeroActionCard: React.FC<HeroActionCardProps> = ({
  icon: Icon,
  title,
  description,
  hint,
  onClick,
  colorScheme,
}) => {
  const colors = colorSchemeMap[colorScheme];

  return (
    <button
      onClick={onClick}
      className={`group flex items-center p-4 md:block md:p-6 bg-surface ${colors.border} ${colors.hoverBorder} border rounded-sm
        transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg text-left w-full`}
    >
      <div className={`p-2 md:p-3 ${colors.iconBg} ${colors.iconHoverBg} rounded-sm inline-block mr-3 md:mr-0 md:mb-4 transition-colors`}>
        <Icon size={20} className={`md:hidden ${colors.iconColor}`} />
        <Icon size={24} className={`hidden md:block ${colors.iconColor}`} />
      </div>
      <div>
        <h3 className="text-main font-semibold text-sm md:text-base md:mb-2">{title}</h3>
        <p className="text-muted text-xs md:text-sm md:mb-2">{description}</p>
        <p className="hidden md:block text-muted/70 text-xs leading-relaxed">{hint}</p>
      </div>
    </button>
  );
};

export const WelcomeScreen: React.FC = () => {
  const { handleNewTab, handleNewCanvas, handleNewPopulatedTab } = useRootStore();
  const welcomeRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  const [showToolSelector, setShowToolSelector] = useState(false);

  const handleDoubleClick = useCallback(() => {
    handleNewTab(false);
  }, [handleNewTab]);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLDivElement>) => {
      const text = e.clipboardData.getData("text");
      if (text) {
        handleNewTab(false, text);
      }
    },
    [handleNewTab],
  );

  const handleToolSelect = useCallback(
    async (item: ToolItem) => {
      await toolService.executeTool(item, {
        side: 'left',
        activeWorkspaceId: '', // Default for welcome
        addTab: (tabData) => handleNewPopulatedTab(tabData),
        createCanvas: (isRight) => handleNewCanvas(isRight),
      });
      setShowToolSelector(false);
    },
    [handleNewCanvas, handleNewPopulatedTab],
  );

  const handleCreateNewTab = useCallback(() => {
    handleNewTab(false);
  }, [handleNewTab]);

  const handleOpenToolSelector = useCallback(() => {
    // Delay opening the selector slightly (50ms) to allow double-clicks on the
    // trigger button to propagate to the container first. This prevents the
    // modal from intercepting the second click of a double-click action.
    setTimeout(() => {
      setShowToolSelector(true);
    }, 50);
  }, []);

  const handleImportFromClipboard = useCallback(async () => {
    const content = await getJSONDemoContent();
    handleNewTab(false, content);
  }, [handleNewTab]);

  const handlePasteFromClipboard = useCallback(async () => {
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

  const handleOpenFile = useCallback(() => {
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
            // Extract filename without extension for tab title
            handleNewTab(false, content);
            // Update the tab title after creation
            // Note: This is a simplified approach - in a real implementation
            // you might want to wait for the tab to be created and then update its title
          }
        };
        reader.readAsText(file);
      }
      // Clean up
      document.body.removeChild(input);
    };

    document.body.appendChild(input);
    input.click();
  }, [handleNewTab]);

  const handleImportWorkspace = useCallback(async () => {
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

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !showToolSelector &&
        pathSegments.length === 0 &&
        location.pathname === "/"
      ) {
        handleOpenToolSelector();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [showToolSelector, handleOpenToolSelector]);

  // Primary actions - most common first-time user tasks
  const primaryActions: HeroActionCardProps[] = [
    {
      icon: FileJson,
      title: "Format JSON",
      description: "See Smart View in action",
      hint: "Pastes from clipboard to demo Tree View, analysis, and formatting",
      onClick: handleImportFromClipboard,
      colorScheme: "primary",
    },
    {
      icon: Extension,
      title: "Dev Tools",
      description: "40+ offline utilities",
      hint: "JWT, Regex, Cron, Diff, UUID, Base64, and converters",
      onClick: handleOpenToolSelector,
      colorScheme: "info",
    },
    {
      icon: FileText,
      title: "New Scratch Tab",
      description: "Full-featured Monaco editor",
      hint: "Markdown, TypeScript, SQL, JSON, and 40+ formats",
      onClick: handleCreateNewTab,
      colorScheme: "warning",
    },
  ];

  // Secondary actions - other entry points
  const secondaryActions = [
    {
      icon: File,
      title: "Open File",
      description: "From your computer",
      onClick: handleOpenFile,
    },
    {
      icon: Upload,
      title: "Paste Content",
      description: "Auto-detect format",
      onClick: handlePasteFromClipboard,
    },
    {
      icon: Package,
      title: "Import Workspace",
      description: "Load .scratch file",
      onClick: handleImportWorkspace,
    },
  ];

  return (
    <div className="h-full min-h-0 w-full flex flex-col bg-canvas">
      {/* Tab Actions Bar */}
      <div className="flex justify-end bg-surface h-8">
        <TabActions
          onShowTabletSelector={() => setShowToolSelector(true)}
        />
      </div>

      {/* Welcome Content */}
      <div
        ref={welcomeRef}
        data-testid="welcome-scroll-container"
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar flex flex-col items-center justify-start md:justify-center text-muted cursor-pointer relative outline-none px-4 py-6 md:px-8 md:py-12"
        onDoubleClick={handleDoubleClick}
        onPaste={handlePaste}
        tabIndex={-1}
      >
        {/* TIER 1: Hero Section - Orientation */}
        <div className="text-center mb-6 md:mb-12 w-full max-w-3xl">
          <div className="bg-element border border-base rounded-sm p-4 md:p-8">

            {/* Logo + Title */}
            <div className="flex items-center justify-center mb-3 md:mb-4">
              <img
                src="/favicon-gray.svg"
                alt="Scratch Tabs Logo"
                className="w-6 h-6 mr-3 md:w-7 md:h-7 md:mr-4 flex-shrink-0"
              />
              <h1 className="text-xl md:text-3xl font-mono font-medium text-main">SCRATCH_TABS</h1>
            </div>
            <p className="text-muted text-xs md:text-sm font-mono mb-4 md:mb-6">// v1.49.0</p>

            {/* Value Proposition */}
            <h2 className="text-lg md:text-2xl font-semibold text-main mb-2 md:mb-4">
              Your Private Dev Workspace
            </h2>
            <p className="text-xs md:text-sm text-muted mb-4 md:mb-6">
              Monaco editor • <span className="text-primary">Smart Views</span> • 40+ Dev Tools
            </p>

            {/* Trust Badges */}
            <div className="flex justify-center gap-3 md:gap-6 text-xs text-muted">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-success/60" />
                <span className="md:hidden">Private</span>
                <span className="hidden md:inline">Offline & Private</span>
              </div>
              <div className="flex items-center gap-2">
                <Database size={14} className="text-success/60" />
                <span className="md:hidden">Local</span>
                <span className="hidden md:inline">Persisted Locally</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-success/60" />
                <span className="md:hidden">Offline</span>
                <span className="hidden md:inline">No Server Calls</span>
              </div>
            </div>
          </div>

          <aside
            data-testid="mobile-desktop-recommendation"
            className="md:hidden mt-3 flex items-start gap-2 rounded-sm border border-info/30 bg-info/10 px-3 py-2 text-left text-xs text-muted"
          >
            <span className="font-semibold text-main whitespace-nowrap">Best on desktop</span>
            <span>Scratch Tabs is built for larger screens. Core tools work here.</span>
          </aside>
        </div>

        {/* TIER 2: Primary Actions - Common Tasks */}
        <section className="w-full max-w-4xl mb-6 md:mb-8">
          <h3 className="text-xs font-mono text-muted/50 mb-3 md:mb-4 text-center tracking-[0.2em] uppercase">
            <span className="text-success/60">// </span>get_started
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
            {primaryActions.map((action, index) => (
              <HeroActionCard key={index} {...action} />
            ))}
          </div>
        </section>

        {/* TIER 3: Secondary Actions - Other Options */}
        <section data-testid="desktop-secondary-actions" className="hidden md:block w-full max-w-4xl mb-8">
          <h4 className="text-xs font-mono text-muted/50 mb-3 text-center tracking-[0.2em] uppercase">
            <span className="text-success/60">// </span>other_options
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {secondaryActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className="group p-4 bg-surface hover:bg-surface-highlight
                  rounded-sm border border-base hover:border-primary/30
                  transition-all duration-200 text-left"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-element rounded-sm">
                    <action.icon size={18} className="text-secondary" />
                  </div>
                  <div className="text-main font-medium text-sm">{action.title}</div>
                </div>
                <p className="text-muted text-xs">{action.description}</p>
              </button>
            ))}
          </div>
        </section>

        <details data-testid="mobile-secondary-actions" className="md:hidden w-full max-w-4xl mb-4 group">
          <summary className="cursor-pointer text-center text-xs font-mono text-muted/70 tracking-[0.16em] uppercase py-2">
            More ways to start
          </summary>
          <div className="grid grid-cols-1 gap-2 pt-2">
            {secondaryActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className="flex items-center gap-3 p-3 bg-surface hover:bg-surface-highlight rounded-sm border border-base hover:border-primary/30 transition-all duration-200 text-left"
              >
                <div className="p-2 bg-element rounded-sm">
                  <action.icon size={18} className="text-secondary" />
                </div>
                <div>
                  <div className="text-main font-medium text-sm">{action.title}</div>
                  <p className="text-muted text-xs">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </details>

        {/* TIER 4: Keyboard Shortcuts */}
        <div className="hidden md:flex mt-8 text-xs text-muted font-mono flex-wrap gap-4 justify-center">
          <span>
            <kbd className="bg-surface border border-base px-2 py-1 rounded">Double Click</kbd>
            {" "}to create tab
          </span>
          <span>
            <kbd className="bg-surface border border-base px-2 py-1 rounded">/</kbd>
            {" "}for dev tools
          </span>
          <span>
            <kbd className="bg-surface border border-base px-2 py-1 rounded">Ctrl+V</kbd>
            {" "}to paste
          </span>
          <span>
            <kbd className="bg-surface border border-base px-2 py-1 rounded">Ctrl+Shift+-</kbd>
            {" / "}
            <kbd className="bg-surface border border-base px-2 py-1 rounded">Ctrl+Shift+=</kbd>
            {" "}to navigate
          </span>
        </div>
        <p className="md:hidden pb-2 text-center text-xs text-muted">
          Paste content or choose an action to get started.
        </p>
      </div>

      {showToolSelector && (
        <ToolSelectorModal
          onSelect={handleToolSelect}
          onClose={() => setShowToolSelector(false)}
        />
      )}
    </div>
  );
};
