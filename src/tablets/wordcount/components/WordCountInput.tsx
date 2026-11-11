import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FileText, ClipboardPaste, Trash2, Copy, ExternalLink, Check } from '../../../components/Icons';
import Editor from '@monaco-editor/react';
import { useTabletTabCreation } from '../../bridge';
import { useTabletContext } from '../../bridge/context';
import { useThemeStore } from '../../../stores/themeStore';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';

interface WordCountInputProps {
  value: string;
  title?: string;
  onChange: (value: string) => void;
  onTitleChange?: (title: string) => void;
  highlights?: Array<{ startIndex: number; endIndex: number; className: string }>;
  onEditorReady?: (editor: any) => void;
  reportContent?: string;
}

export const WordCountInput: React.FC<WordCountInputProps> = ({
  value,
  title = '',
  onChange,
  onTitleChange,
  highlights = [],
  onEditorReady,
  reportContent = ''
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [activeTab, setActiveTab] = useState<'text' | 'report'>('text');
  const [copySuccess, setCopySuccess] = useState(false);
  const editorRef = useRef<any>(null);

  // Theme hook
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  // Bridge hooks
  const { createBackgroundTab } = useTabletTabCreation();
  const { tabId } = useTabletContext();

  // Sync local state with parent value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Create a debounced onChange function
  const timeoutRef = useRef<NodeJS.Timeout>();
  const debouncedOnChange = useCallback((value: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onChange(value);
    }, 300);
  }, [onChange]);

  const handleChange = useCallback((newValue: string) => {
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  }, [debouncedOnChange]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleChange(text);
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  }, [handleChange]);

  const handleClear = useCallback(() => {
    handleChange('');
  }, [handleChange]);

  const handleCopyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(localValue);
      // Could add a toast notification here if needed
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }, [localValue]);

  const handleCopyReport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(reportContent);
      setCopySuccess(true);
      // Reset icon after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy report:', error);
    }
  }, [reportContent]);

  const handleOpenInNewTab = useCallback(async () => {
    if (!reportContent) return;

    try {
      await createBackgroundTab(
        `Word Count Report - ${new Date().toLocaleDateString()}`,
        reportContent,
        'markdown',
        tabId
      );
    } catch (error) {
      console.error('Failed to create background tab:', error);
    }
  }, [reportContent, createBackgroundTab, tabId]);


  const handleEditorMount = useCallback((editor: any) => {
    editorRef.current = editor;
    if (onEditorReady) {
      onEditorReady(editor);
    }
  }, [onEditorReady]);

  const handleEditorChange = useCallback((newValue: string | undefined) => {
    const value = newValue || '';
    setLocalValue(value);
    debouncedOnChange(value);
  }, [debouncedOnChange]);

  // Apply highlights to Monaco editor
  useEffect(() => {
    if (editorRef.current && highlights.length > 0) {
      const decorations = highlights.map(highlight => ({
        range: editorRef.current.getModel().getPositionAt(highlight.startIndex),
        options: {
          className: highlight.className,
          isWholeLine: false
        }
      }));
    }
  }, [highlights]);

  // Enhanced markdown to HTML converter with smaller fonts and proper tables
  const renderMarkdown = useCallback((markdown: string) => {
    let html = markdown;

    // Convert markdown tables to HTML tables
    const tableRegex = /(\|.*\|\n)+/gm;
    html = html.replace(tableRegex, (match) => {
      const lines = match.trim().split('\n');
      const headerLine = lines[0];
      const separatorLine = lines[1];
      const dataLines = lines.slice(2);

      // Skip if no proper separator line
      if (!separatorLine || !separatorLine.includes('---')) {
        return match;
      }

      // Process header
      const headers = headerLine.split('|').slice(1, -1).map(h => h.trim());

      // Process data rows
      const rows = dataLines.map(line =>
        line.split('|').slice(1, -1).map(cell => cell.trim())
      );

      let tableHtml = '<table class="w-full text-xs border-collapse border border-base mb-4">';

      // Header
      tableHtml += '<thead class="bg-surface-raised">';
      tableHtml += '<tr>';
      headers.forEach(header => {
        tableHtml += `<th class="border border-base px-2 py-1 text-left text-main font-medium">${header}</th>`;
      });
      tableHtml += '</tr>';
      tableHtml += '</thead>';

      // Body
      tableHtml += '<tbody>';
      rows.forEach(row => {
        tableHtml += '<tr class="hover:bg-element-hover">';
        row.forEach(cell => {
          // Process cell content for icons and formatting
          const processedCell = cell
            .replace(/✅/g, '<span class="text-green-400">✅</span>')
            .replace(/⚠️/g, '<span class="text-yellow-400">⚠️</span>')
            .replace(/❌/g, '<span class="text-red-400">❌</span>')
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-main">$1</strong>');

          tableHtml += `<td class="border border-base px-2 py-1 text-main">${processedCell}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody>';
      tableHtml += '</table>';

      return tableHtml;
    });

    // Process other markdown elements with smaller fonts
    html = html
      .replace(/^# (.*$)/gm, '<h1 class="text-lg font-bold text-main mb-3 mt-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-base font-semibold text-main mb-2 mt-4">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-sm font-medium text-main mb-2 mt-3">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-main">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-main">$1</em>')
      .replace(/^- (.*$)/gm, '<li class="text-xs text-main ml-4 mb-1">• $1</li>')
      .replace(/^📚|📈|✂️|🎯|⚡|💪|📱|🔍|🎉/gm, (match) => `<span class="text-sm">${match}</span>`)
      .replace(/^---$/gm, '<hr class="border-base my-3">')
      .replace(/\n\n/g, '</p><p class="text-xs text-main mb-2">')
      .replace(/^(?!<[h|l|t|s])/gm, '<p class="text-xs text-main mb-2">')
      .replace(/\n/g, '<br>');

    return html;
  }, []);

  return (
    <div className="bg-surface-secondary border border-base rounded-lg p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center space-x-2 mb-3 flex-shrink-0">
        <FileText size={16} className="text-secondary" />
        <h3 className="text-sm font-semibold text-main uppercase tracking-wide">
          Content
        </h3>
      </div>

      {/* Title Input Field */}
      <div className="mb-3 flex-shrink-0">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange?.(e.target.value)}
          placeholder="Enter document title (optional)"
          className="w-full bg-element border border-base rounded-md px-3 py-2 text-sm text-main placeholder-muted focus:outline-none focus:border-focus focus:ring-1 focus:ring-focus/20"
        />
      </div>

      {/* Tabs and Actions */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center space-x-4">
          {/* Tabs */}
          <div className="flex space-x-1 bg-element rounded-md p-1">
            <button
              onClick={() => setActiveTab('text')}
              className={`px-3 py-1 text-xs rounded transition-colors ${activeTab === 'text'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'text-secondary hover:text-main'
                }`}
            >
              Text Input
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`px-3 py-1 text-xs rounded transition-colors ${activeTab === 'report'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'text-secondary hover:text-main'
                }`}
            >
              Report
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {activeTab === 'text' ? (
            <>
              <button
                onClick={handlePaste}
                className="p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
                title="Paste from clipboard"
              >
                <ClipboardPaste size={16} />
              </button>
              <button
                onClick={handleCopyText}
                className="p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
                title="Copy text to clipboard"
                disabled={!localValue}
              >
                <Copy size={16} />
              </button>
              <button
                onClick={handleClear}
                className="p-1.5 text-secondary hover:text-red-400 hover:bg-element-hover rounded transition-colors"
                title="Clear text"
                disabled={!localValue}
              >
                <Trash2 size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCopyReport}
                className={`p-1.5 rounded transition-colors ${copySuccess
                    ? 'text-green-400 bg-green-500/20'
                    : 'text-secondary hover:text-main hover:bg-element-hover'
                  }`}
                title={copySuccess ? "Copied to clipboard!" : "Copy report to clipboard"}
                disabled={!reportContent}
              >
                {copySuccess ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <button
                onClick={handleOpenInNewTab}
                className="p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors"
                title="Open report in new background tab"
                disabled={!reportContent}
              >
                <ExternalLink size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 border border-base rounded-md overflow-hidden min-h-0 custom-scrollbar">
        {activeTab === 'text' ? (
          <Editor
            height="100%"
            defaultLanguage="plaintext"
            value={localValue}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            theme={isDarkMode ? "vs-dark" : "light"}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbers: 'on',
              wordWrap: 'on',
              automaticLayout: true,
            }}
          />
        ) : (
          <div className="h-full bg-canvas p-4 overflow-auto custom-scrollbar">
            {reportContent ? (
              <div
                className={`prose max-w-none ${isDarkMode ? "prose-invert" : ""}`}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMarkdown(reportContent)) }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted">
                <div className="text-center">
                  <FileText size={48} className="mx-auto mb-4 text-muted" />
                  <p className="text-sm">Enter text to generate analysis report</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      {activeTab === 'text' && localValue && (
        <div className="mt-2 text-xs text-muted flex-shrink-0">
          {localValue.length} characters
        </div>
      )}
    </div>
  );
};