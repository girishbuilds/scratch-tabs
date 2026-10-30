import React, { useRef, useEffect, useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import { useRootStore } from "../../stores";
import { ToolSelectorModal } from "../ToolSelector";
import { toolService, ToolItem } from "../../services/toolService";
import { TabActions } from "../Tab/TabActions";
import { FileText, Upload, File, Package, FileJson } from "../Icons";
import { APP_VERSION } from "../../data/releases";
import { DevToolsRow } from "./DevToolsRow";
import { PasteDropHint } from "./PasteDropHint";
import { SecondaryActionButton } from "./SecondaryActionButton";
import { PrimaryActionCard, PrimaryActionCardProps } from "./PrimaryActionCard";
import { WelcomeHero } from "./WelcomeHero";
import { WelcomeShortcuts } from "./WelcomeShortcuts";
import { useWelcomeActions } from "./useWelcomeActions";

export const WelcomeScreen: React.FC = () => {
  const { handleNewTab, handleNewCanvas, handleNewPopulatedTab } = useRootStore();
  const { createNewTab, openSmartViewDemo, pasteFromClipboard, openFile, importWorkspace } =
    useWelcomeActions();
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

  const handleOpenToolSelector = useCallback(() => {
    // Delay opening the selector slightly (50ms) to allow double-clicks on the
    // trigger button to propagate to the container first. This prevents the
    // modal from intercepting the second click of a double-click action.
    setTimeout(() => {
      setShowToolSelector(true);
    }, 50);
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

  // Primary actions - one dominant action, one quieter alternative
  const primaryActions: PrimaryActionCardProps[] = [
    {
      icon: FileText,
      title: "New Scratch Tab",
      description: "Start writing, pasting or editing in your private workspace.",
      ctaLabel: "Create tab",
      onClick: createNewTab,
      variant: "primary",
    },
    {
      icon: FileJson,
      title: "Try a Smart View",
      description: "Open sample JSON with a tree view, search and formatting.",
      ctaLabel: "Try example",
      onClick: openSmartViewDemo,
      variant: "neutral",
    },
  ];

  // Secondary actions - other entry points
  const secondaryActions = [
    {
      icon: File,
      title: "Open File",
      onClick: openFile,
    },
    {
      icon: Upload,
      title: "Paste Content",
      onClick: pasteFromClipboard,
    },
    {
      icon: Package,
      title: "Import Workspace",
      onClick: importWorkspace,
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
        <WelcomeHero />

        <aside
          data-testid="mobile-desktop-recommendation"
          className="md:hidden w-full mb-6 flex items-start gap-2 rounded-sm border border-info/30 bg-info/10 px-3 py-2 text-left text-xs text-muted"
        >
          <span className="font-semibold text-main whitespace-nowrap">Best on desktop</span>
          <span>Scratch Tabs is built for larger screens. Core tools work here.</span>
        </aside>

        <PasteDropHint />

        {/* Primary actions + dev tools */}
        <section className="w-full max-w-4xl mb-6 md:mb-8">
          <h3 className="text-xs font-mono text-muted mb-3 md:mb-4 text-center tracking-[0.2em] uppercase">
            <span className="text-success">// </span>get_started
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 mb-2 md:mb-4">
            {primaryActions.map((action) => (
              <PrimaryActionCard key={action.title} {...action} />
            ))}
          </div>
          <DevToolsRow onBrowseAll={handleOpenToolSelector} onSelectTool={handleToolSelect} />
        </section>

        {/* Secondary actions - other options */}
        <section data-testid="desktop-secondary-actions" className="hidden md:block w-full max-w-4xl mb-8">
          <h4 className="text-xs font-mono text-muted mb-3 text-center tracking-[0.2em] uppercase">
            <span className="text-success">// </span>other_options
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {secondaryActions.map((action) => (
              <SecondaryActionButton key={action.title} {...action} />
            ))}
          </div>
        </section>

        <details data-testid="mobile-secondary-actions" className="md:hidden w-full max-w-4xl mb-4 group">
          <summary className="cursor-pointer text-center text-xs font-mono text-muted tracking-[0.16em] uppercase py-2">
            More ways to start
          </summary>
          <div className="grid grid-cols-1 gap-2 pt-2">
            {secondaryActions.map((action) => (
              <SecondaryActionButton key={action.title} {...action} />
            ))}
          </div>
        </details>

        <WelcomeShortcuts />
        <p className="md:hidden pb-2 text-center text-xs text-muted">
          Paste content or choose an action to get started.
        </p>
        <p className="mt-6 text-xs font-mono text-muted">// v{APP_VERSION}</p>
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
