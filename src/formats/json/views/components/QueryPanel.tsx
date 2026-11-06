import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Editor } from '@monaco-editor/react';
import { X, Copy, FileText, Check, BookOpen, Info } from 'lucide-react';
import { useJmespath } from '../../hooks/useJmespath';
import { useQueryPanelStore } from '../../stores/useQueryPanelStore';
import { Tab } from '../../../../types';
import { generateContextualSamples } from '../../utils/generateContextualSamples';
import { useThemeStore } from '../../../../stores/themeStore';

interface QueryPanelProps {
  content: string;
  addTab: (tab: Tab) => void;
  tabId: string; // Receive tabId as a prop
}

// Constants
const COPY_FEEDBACK_DURATION_MS = 2000;
const DEFAULT_QUERY_EDITOR_HEIGHT = 60;

export const QueryPanel: React.FC<QueryPanelProps> = ({ content, addTab, tabId }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const samplesRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const { getStateForTab, setQuery: setQueryInStore, closePanel } = useQueryPanelStore();
  const { query } = getStateForTab(tabId);
  const { isDarkMode } = useThemeStore();

  // Generate contextual sample queries based on actual JSON content
  const sampleQueries = useMemo(() => {
    return generateContextualSamples(content);
  }, [content]);

  const placeholder = sampleQueries.length > 0
    ? `e.g. ${sampleQueries[0].query}`
    : 'Enter a JMESPath expression';

  // Execute JMESPath query with debouncing
  const { results, error } = useJmespath(content, query);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (samplesRef.current && !samplesRef.current.contains(event.target as Node)) {
        setShowSamples(false);
      }
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setShowInfo(false);
      }
    };

    if (showSamples || showInfo) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSamples, showInfo]);

  // Format results for display
  const formattedResults = React.useMemo(() => {
    if (error) {
      return error;
    }
    if (results === null) {
      return '';
    }
    try {
      return JSON.stringify(results, null, 2);
    } catch (e) {
      return String(results);
    }
  }, [results, error]);

  // Handle copying results to clipboard
  const handleCopyResults = useCallback(async () => {
    if (!formattedResults) return;

    try {
      await navigator.clipboard.writeText(formattedResults);
      setIsCopied(true);

      setTimeout(() => {
        setIsCopied(false);
      }, COPY_FEEDBACK_DURATION_MS);
    } catch (error) {
      console.error('Failed to copy results to clipboard:', error);
    }
  }, [formattedResults]);

  // Handle exporting results to a new tab
  const handleExportToTab = useCallback(() => {
    if (!formattedResults) return;

    const newTab: Tab = {
      id: crypto.randomUUID(),
      title: 'Query Results',
      content: formattedResults,
      language: 'json',
      languageLocked: false,
      cursorPosition: { lineNumber: 1, column: 1 },
      isPinned: false,
      dateCreated: Date.now(),
      lastModified: Date.now(),
      workspaceId: '', // Will be set by addTab
    };

    addTab(newTab);
  }, [formattedResults, addTab]);

  // Handle selecting a sample query
  const handleSelectSample = useCallback((sampleQuery: string) => {
    setQueryInStore(tabId, sampleQuery);
    setShowSamples(false);
  }, [tabId, setQueryInStore]);

  return (
    <div className="flex flex-col h-full bg-surface-secondary border-t border-base">
      {/* Panel Header - Compact */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-base bg-surface-secondary">
        <div className="flex items-center space-x-2 relative">
          <h3 className="text-xs font-medium text-main">
            JMESPath Query
          </h3>

          {/* Info Icon */}
          <div className="relative" ref={infoRef}>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-0.5 rounded hover:bg-element-hover text-muted hover:text-main transition-colors"
              title="Learn about JMESPath"
            >
              <Info size={12} />
            </button>

            {/* Info Panel */}
            {showInfo && (
              <div className="absolute top-full left-0 mt-1 w-96 bg-surface border border-base rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto custom-scrollbar">
                <div className="p-4">
                  <h4 className="text-sm font-semibold text-main mb-2">About JMESPath Query Tool</h4>
                  <p className="text-xs text-secondary mb-3">
                    JMESPath is a query language for JSON. Use it to extract, filter, and transform data from JSON documents.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-medium text-main mb-1">Basic Syntax:</div>
                      <ul className="text-xs text-secondary space-y-1 ml-3">
                        <li><code className="text-info">[0]</code> - Get first array element</li>
                        <li><code className="text-info">[*]</code> - Get all array elements</li>
                        <li><code className="text-info">.property</code> - Access object property</li>
                        <li><code className="text-info">[*].name</code> - Project field from all items</li>
                      </ul>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-main mb-1">Filtering:</div>
                      <ul className="text-xs text-secondary space-y-1 ml-3">
                        <li><code className="text-info">[?age &gt; `25`]</code> - Filter by numeric value</li>
                        <li><code className="text-info">[?active==`true`]</code> - Filter by boolean</li>
                        <li><code className="text-info">[?name==`'John'`]</code> - Filter by string</li>
                      </ul>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-main mb-1">Functions:</div>
                      <ul className="text-xs text-secondary space-y-1 ml-3">
                        <li><code className="text-info">length(@)</code> - Count items</li>
                        <li><code className="text-info">keys(@)</code> - Get property names</li>
                        <li><code className="text-info">sort_by(@, &age)</code> - Sort by field</li>
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-base">
                      <p className="text-xs text-secondary">
                        💡 Click <span className="font-medium text-secondary">Samples</span> to see queries relevant to your current JSON data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1 relative">
          {/* Sample Queries Button */}
          <div className="relative" ref={samplesRef}>
            <button
              onClick={() => setShowSamples(!showSamples)}
              className="flex items-center space-x-1 px-2 py-0.5 rounded text-xs transition-colors hover:bg-element-hover text-secondary"
              title="Sample Queries"
            >
              <BookOpen size={12} />
              <span>Samples</span>
            </button>

            {/* Dropdown */}
            {showSamples && (
              <div className="absolute top-full right-0 mt-1 w-80 bg-surface border border-base rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto custom-scrollbar">
                <div className="p-2">
                  <div className="text-xs text-secondary px-2 py-1 font-medium">
                    Sample Queries for Your Data
                  </div>
                  {sampleQueries.map((sample, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectSample(sample.query)}
                      className="w-full text-left px-2 py-2 rounded hover:bg-element-hover transition-colors"
                    >
                      <div className="text-xs font-medium text-main">{sample.label}</div>
                      <div className="text-xs text-info font-mono mt-0.5">{sample.query}</div>
                      <div className="text-xs text-secondary mt-0.5">{sample.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleCopyResults}
            disabled={!formattedResults}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs transition-colors ${
              isCopied
                ? 'bg-success-subtle text-success'
                : formattedResults
                ? 'hover:bg-element-hover text-secondary'
                : 'text-muted cursor-not-allowed'
            }`}
            title={isCopied ? 'Copied!' : 'Copy Results'}
          >
            {isCopied ? <Check size={12} /> : <Copy size={12} />}
            <span>{isCopied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={handleExportToTab}
            disabled={!formattedResults}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-xs transition-colors ${
              formattedResults
                ? 'hover:bg-element-hover text-secondary'
                : 'text-muted cursor-not-allowed'
            }`}
            title="Export to New Tab"
          >
            <FileText size={12} />
            <span>Export</span>
          </button>
          <button
            onClick={() => closePanel(tabId)}
            className="p-0.5 rounded hover:bg-element-hover text-secondary hover:text-main transition-colors"
            title="Close Query Panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Query Editor - Inline label */}
      <div className="flex flex-col border-b border-base">
        <div className="flex items-center px-2 py-0.5 bg-surface border-b border-base">
          <span className="text-xs text-muted mr-2">Query:</span>
        </div>
        <div style={{ height: `${DEFAULT_QUERY_EDITOR_HEIGHT}px` }} className="bg-surface relative">
          {!query && (
            <div
              className="absolute left-[14px] top-1 z-10 text-[13px] font-mono text-muted pointer-events-none select-none"
              data-testid="query-placeholder"
            >
              {placeholder}
            </div>
          )}
          <Editor
            height="100%"
            language="plaintext"
            theme={isDarkMode ? "vs-dark" : "vs"}
            value={query}
            onChange={(value) => setQueryInStore(tabId, value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: 'on',
              lineNumbers: 'off',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              folding: false,
              renderLineHighlight: 'none',
              occurrencesHighlight: 'off',
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              scrollbar: {
                vertical: 'hidden',
                horizontal: 'auto',
              },
              suggest: {
                showKeywords: false,
              },
              padding: { top: 4, bottom: 4 },
            }}
          />
        </div>
      </div>

      {/* Results Viewer */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-2 py-0.5 bg-surface border-b border-base">
          <span className={`text-xs ${error ? 'text-danger' : 'text-muted'}`}>
            {error ? 'Error' : 'Results'}
          </span>
        </div>
        <div className="flex-1 bg-surface">
          <Editor
            height="100%"
            language={error ? 'plaintext' : 'json'}
            theme={isDarkMode ? "vs-dark" : "vs"}
            value={formattedResults}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: 'on',
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              renderValidationDecorations: 'off',
              colorDecorators: false,
              padding: { top: 4 },
            }}
          />
        </div>
      </div>
    </div>
  );
};
