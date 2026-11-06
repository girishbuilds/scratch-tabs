import React from "react";
import { smartViewRegistry } from "../../views/registry";
import { useRootStore } from "../../stores";

interface SmartViewButtonsProps {
  language: string;
  tabId: string;
}

export const SmartViewButtons: React.FC<SmartViewButtonsProps> = ({
  language,
  tabId,
}) => {
  const { getActiveView, setActiveView } = useRootStore();
  const activeViewId = getActiveView(tabId);

  const availableViews = smartViewRegistry.getViewsForLanguage(language);

  if (availableViews.length === 0) {
    return null;
  }

  // The status bar exposes one consistent choice between the source editor and
  // the format's primary smart view. Some formats have more than one view, so
  // an already-active secondary view still counts as Smart View here.
  const primaryView = availableViews[0];
  const isSmartViewActive = availableViews.some((view) => view.id === activeViewId);

  return (
    <div
      data-testid="smart-view-buttons"
      role="group"
      aria-label="View mode"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-base bg-element/60 p-0.5 shadow-sm"
    >
      <button
        type="button"
        onClick={() => {
          if (isSmartViewActive) setActiveView(tabId, null);
        }}
        className={`rounded px-3 py-1 text-xs font-semibold leading-4 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          !isSmartViewActive
            ? "bg-surface-raised text-main shadow-sm ring-1 ring-inset ring-primary/25"
            : "text-secondary hover:bg-element-hover hover:text-main"
        }`}
        title="Text View"
        aria-label="Text View"
        aria-pressed={!isSmartViewActive}
        data-testid="text-view-button"
      >
        Text View
      </button>
      <span aria-hidden="true" className="px-0.5 text-muted/70 text-xs leading-4">
        |
      </span>
      <button
        type="button"
        onClick={() => {
          if (!isSmartViewActive) setActiveView(tabId, primaryView.id);
        }}
        className={`rounded px-3 py-1 text-xs font-semibold leading-4 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
          isSmartViewActive
            ? "bg-surface-raised text-main shadow-sm ring-1 ring-inset ring-primary/25"
            : "text-secondary hover:bg-element-hover hover:text-main"
        }`}
        title={isSmartViewActive ? `Smart View (${primaryView.label})` : `Open Smart View (${primaryView.label})`}
        aria-label={`Smart View (${primaryView.label})`}
        aria-pressed={isSmartViewActive}
        data-testid="data-view-button"
      >
        Smart View
      </button>
    </div>
  );
};
