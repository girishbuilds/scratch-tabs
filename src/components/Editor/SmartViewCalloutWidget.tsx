import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Eye, X } from '../Icons';
import { SmartView } from '../../views/registry';
import { formatRegistry } from '../../formats';

interface SmartViewCalloutWidgetProps {
  view: SmartView;
  languageId: string;
  onSwitch: () => void;
  onDismiss: () => void;
}

export const SmartViewCalloutWidget: React.FC<SmartViewCalloutWidgetProps> = ({
  view,
  languageId,
  onSwitch,
  onDismiss,
}) => {
  // Persistent chip: stays until the user opens the Smart View or dismisses it.

  // Get the format name from the registry
  const formatName = useMemo(() => {
    const formatModule = formatRegistry.getById(languageId);
    return formatModule?.name || languageId.toUpperCase();
  }, [languageId]);

  return (
    <motion.div
      data-testid="smart-view-callout"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-center justify-between gap-3 rounded-lg border border-base bg-surface-raised/95 p-2.5 text-main shadow-xl backdrop-blur-sm max-w-sm"
      style={{
        position: 'relative',
        zIndex: 1000,
        minWidth: '286px'
      }}
    >
      <div className="flex min-w-0 items-center gap-2.5 overflow-hidden">
        <div
          data-testid="smart-view-callout-icon"
          className="flex-shrink-0 rounded-md border border-base bg-element p-1.5 text-secondary"
        >
           <Eye size={15} aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-col" data-testid="smart-view-callout-message">
          <span className="text-xs font-semibold text-main">Smart View available</span>
          <span className="truncate text-[10px] text-muted">{formatName} detected</span>
        </div>
      </div>

      <div className="ml-2 flex flex-shrink-0 items-center gap-1.5">
        <button
          data-testid="smart-view-callout-data-view"
          onClick={onSwitch}
          className="rounded-md border border-base bg-surface-raised px-2.5 py-1.5 text-xs font-semibold text-main shadow-sm transition-colors hover:bg-element-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="Open Smart View"
          title={`Open Smart View (${view.label})`}
        >
          Smart View
        </button>
        <button
          data-testid="smart-view-callout-dismiss"
          onClick={onDismiss}
          className="p-1.5 text-muted hover:text-main hover:bg-element-hover rounded transition-colors"
          title="Dismiss"
          aria-label="Dismiss Smart View suggestion"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
};
