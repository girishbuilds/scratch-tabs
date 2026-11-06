import React from 'react';
import { FileText } from '../Icons';
import { useRootStore } from '../../stores/rootStore';
import { Tab } from '../../types';

interface RichTextControlsProps {
  activeTab: Tab;
}

export const RichTextControls: React.FC<RichTextControlsProps> = ({
  activeTab,
}) => {
  const { updateTabState } = useRootStore();

  const handleToggleRichMode = () => {
    updateTabState(activeTab.id, { 
      isRich: !activeTab.isRich,
      lastModified: Date.now(),
    });
  };

  return (
    <button
      onClick={handleToggleRichMode}
      className="flex items-center space-x-1 px-2 py-1 hover:bg-element/50 rounded transition-colors group"
      title={activeTab.isRich ? 'Switch to Plain Text' : 'Switch to Rich Text'}
      data-testid="rich-text-toggle"
    >
      <FileText size={12} className="text-slate-600 dark:text-muted group-hover:text-slate-900 dark:group-hover:text-secondary" />
      <span className="text-xs text-slate-700 dark:text-secondary">
        {activeTab.isRich ? 'Rich Text' : 'Plain Text'}
      </span>
    </button>
  );
};