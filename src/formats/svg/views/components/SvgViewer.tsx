import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SmartViewProps } from '../../../../views/registry';
import {
  Eye,
  Zap,
  Copy,
  Check,
  Download,
  Info,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  PlusCircle, // Replacing ZoomIn
  Minus, // Replacing ZoomOut  
  RotateCcw,
  AlignLeft,
  ImageIcon
} from '../../../../components/Icons';
import { optimizeWithSvgo, basicCleanup } from '../../utils/optimizer';
import { useActiveEditorStore } from '../../../../stores/activeEditorStore';
import { sanitizeSvg } from '../../../../utils/sanitizeHtml';

interface ElementInfo {
  tagName: string;
  id?: string;
  attributes: { [key: string]: string };
  dataId: string;
}

interface SvgStats {
  elements: number;
  paths: number;
  groups: number;
  size: number;
  viewBox?: string;
}

export const SvgViewer: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
  side,
}) => {
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<{
    originalSize: number;
    optimizedSize: number;
    savings: number;
  } | null>(null);
  const [showInspector, setShowInspector] = useState(true);
  const [svgError, setSvgError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [copySuccess, setCopySuccess] = useState(false);

  const svgContainerRef = useRef<HTMLDivElement>(null);
  const { activeLeftEditor, activeRightEditor } = useActiveEditorStore();

  // Get the appropriate editor based on the side
  const editor = side === 'left' ? activeLeftEditor : activeRightEditor;

  // Parse and enhance SVG content with data-ids for element tracking
  const enhancedSvgContent = useMemo(() => {
    if (!content || !content.trim()) return '';

    try {
      // Add unique data-id attributes to all SVG elements for click tracking
      let enhancedContent = content;
      let idCounter = 0;

      // Match all SVG elements and add data-id if they don't have an id
      enhancedContent = enhancedContent.replace(
        /<(\w+)([^>]*?)(\/?)\s*>/g,
        (match, tagName, attributes, selfClosing) => {
          // Skip if it's a closing tag or already has data-id
          if (match.startsWith('</') || attributes.includes('data-id=')) {
            return match;
          }

          // Add data-id for tracking
          const dataId = `svg-element-${idCounter++}`;

          // Handle self-closing tags properly
          if (selfClosing) {
            return `<${tagName}${attributes} data-id="${dataId}" />`;
          } else {
            return `<${tagName}${attributes} data-id="${dataId}">`;
          }
        }
      );

      setSvgError(null);
      return enhancedContent;
    } catch (error) {
      setSvgError('Invalid SVG content');
      return content;
    }
  }, [content]);

  // Calculate SVG statistics
  const svgStats = useMemo((): SvgStats => {
    if (!content) return { elements: 0, paths: 0, groups: 0, size: 0 };

    const elementCount = (content.match(/<\w+/g) || []).length;
    const pathCount = (content.match(/<path/g) || []).length;
    const groupCount = (content.match(/<g\b/g) || []).length;
    const viewBoxMatch = content.match(/viewBox=["']([^"']+)["']/);

    return {
      elements: elementCount,
      paths: pathCount,
      groups: groupCount,
      size: new Blob([content]).size,
      viewBox: viewBoxMatch ? viewBoxMatch[1] : undefined,
    };
  }, [content]);

  // Handle element clicks in the SVG preview
  const handleSvgClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as Element;
    if (!target || !target.closest) return;

    // Find the nearest SVG element with a data-id
    const svgElement = target.closest('[data-id]') as SVGElement;
    if (!svgElement) return;

    const dataId = svgElement.getAttribute('data-id');
    if (!dataId) return;

    // Extract element information
    const elementInfo: ElementInfo = {
      tagName: svgElement.tagName.toLowerCase(),
      id: svgElement.id || undefined,
      dataId,
      attributes: {},
    };

    // Collect relevant attributes
    const relevantAttrs = ['id', 'class', 'fill', 'stroke', 'stroke-width', 'd', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'transform'];
    relevantAttrs.forEach(attr => {
      const value = svgElement.getAttribute(attr);
      if (value) {
        elementInfo.attributes[attr] = value;
      }
    });

    setSelectedElement(elementInfo);

    // Highlight corresponding code in Monaco editor
    if (editor && dataId) {
      try {
        const model = editor.getModel();
        if (model && !model.isDisposed()) {
          const fullText = model.getValue();
          const lines = fullText.split('\n');

          // Find the line containing this data-id
          let targetLine = -1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(dataId)) {
              targetLine = i + 1; // Monaco uses 1-based line numbers
              break;
            }
          }

          if (targetLine > 0) {
            // Highlight and scroll to the line
            editor.setSelection({
              startLineNumber: targetLine,
              startColumn: 1,
              endLineNumber: targetLine,
              endColumn: lines[targetLine - 1].length + 1,
            });
            editor.revealLineInCenter(targetLine);
            editor.focus();
          }
        }
      } catch (error) {
        // Silently handle highlighting errors
      }
    }
  }, [editor]);

  // Handle SVG optimization
  const handleOptimize = useCallback(async () => {
    if (!content || isOptimizing) return;

    setIsOptimizing(true);
    setOptimizationResult(null);

    try {
      const originalSize = new Blob([content]).size;
      let optimizedContent: string;

      // Try advanced optimization first, with basic cleanup as fallback
      try {
        optimizedContent = await optimizeWithSvgo(content);
      } catch (error) {
        optimizedContent = basicCleanup(content);
      }

      const optimizedSize = new Blob([optimizedContent]).size;
      const savings = ((originalSize - optimizedSize) / originalSize) * 100;

      setOptimizationResult({
        originalSize,
        optimizedSize,
        savings: Math.max(0, savings), // Ensure non-negative
      });


      // Update the editor content directly via the editor rather than invalidating the model
      // This prevents the Monaco editor from disappearing
      if (editor && !editor.getModel()?.isDisposed()) {

        // Use executeEdits to preserve undo stack and avoid model invalidation
        const model = editor.getModel();
        if (model) {
          editor.pushUndoStop();
          editor.executeEdits('svg-optimization', [{
            range: model.getFullModelRange(),
            text: optimizedContent,
            forceMoveMarkers: false,
          }]);
          editor.pushUndoStop();
        }
      } else {
        // Fallback to the traditional method if editor is not available
        onContentChange(optimizedContent);
      }


    } catch (error) {
      setSvgError('Optimization failed. Please check your SVG syntax.');
    } finally {
      setIsOptimizing(false);
    }
  }, [content, onContentChange, isOptimizing, editor]);

  // Handle SVG formatting
  const handleFormat = useCallback(async () => {
    if (!editor || !content) return;

    try {
      // Use Monaco's built-in formatting action
      const action = editor.getAction('editor.action.formatDocument');
      if (action) {
        await action.run();
      } else {
        // Fallback: trigger formatting command
        await editor.trigger('format', 'editor.action.formatDocument', {});
      }
    } catch (error) {
      // Silently handle formatting errors - Monaco will show any issues in the editor
    }
  }, [editor, content]);

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      // Silently handle errors
    }
  }, [content]);

  // Handle SVG export
  const handleExportSvg = useCallback(() => {
    if (!content) return;

    try {
      const blob = new Blob([content], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
    }
  }, [content]);

  // Handle PNG export
  const handleExportPng = useCallback(() => {
    if (!content) return;

    try {
      // Create a temporary SVG element to get dimensions
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sanitizeSvg(content);
      const svgElement = tempDiv.querySelector('svg');

      if (!svgElement) return;

      // Get SVG dimensions
      let width = 800; // default width
      let height = 600; // default height

      // Try to get dimensions from width/height attributes
      const widthAttr = svgElement.getAttribute('width');
      const heightAttr = svgElement.getAttribute('height');

      if (widthAttr && heightAttr) {
        width = parseInt(widthAttr) || width;
        height = parseInt(heightAttr) || height;
      } else if (svgElement.viewBox) {
        // Try to get dimensions from viewBox
        const viewBox = svgElement.viewBox.baseVal;
        if (viewBox.width && viewBox.height) {
          width = viewBox.width;
          height = viewBox.height;
        }
      }

      // Create a canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas dimensions with device pixel ratio for better quality
      const devicePixelRatio = window.devicePixelRatio || 1;
      const scaleFactor = 2; // Additional scaling for higher quality
      canvas.width = width * devicePixelRatio * scaleFactor;
      canvas.height = height * devicePixelRatio * scaleFactor;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';

      // Scale the context for high-DPI displays
      ctx.scale(devicePixelRatio * scaleFactor, devicePixelRatio * scaleFactor);

      // Get background color from theme
      const computedStyle = getComputedStyle(document.documentElement);

      // Use canvas color for background (matches the preview)
      // We need to parse the RGB values from the CSS variable
      const canvasColorVar = computedStyle.getPropertyValue('--color-canvas').trim();
      const [r, g, b] = canvasColorVar.split(' ').map(c => parseInt(c));

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(0, 0, width, height);

      // Create an image from the SVG
      const img = new Image();
      img.onload = () => {
        // Draw the image on the canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to PNG blob
        canvas.toBlob((blob) => {
          if (!blob) return;

          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'export.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 'image/png', 1.0);
      };

      // Create a blob URL for the SVG
      const svgBlob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      img.src = svgUrl;

      // Clean up after a delay
      setTimeout(() => {
        URL.revokeObjectURL(svgUrl);
      }, 1000);

    } catch (error) {
      console.error('PNG export failed:', error);
    }
  }, [content]);

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Handle zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1));
  const handleZoomReset = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Handle pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Set up mouse event listeners for panning
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Validate SVG content
  const isValidSvg = useMemo(() => {
    if (!content || !content.trim()) return false;
    return content.includes('<svg') && content.includes('</svg>');
  }, [content]);

  if (!content || !content.trim()) {
    return (
      <div className="h-full flex items-center justify-center bg-canvas text-secondary">
        <div className="text-center">
          <Eye size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No SVG Content</p>
          <p className="text-sm">Add SVG code to see the preview</p>
        </div>
      </div>
    );
  }

  if (!isValidSvg) {
    return (
      <div className="h-full flex items-center justify-center bg-canvas text-secondary">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto mb-4 text-warning" />
          <p className="text-lg font-medium">Invalid SVG</p>
          <p className="text-sm">Please check your SVG syntax</p>
          {svgError && (
            <p className="text-xs text-danger mt-2">{svgError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-canvas">
      {/* Toolbar */}
      <div className="flex-shrink-0 bg-surface-secondary border-b border-base p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-sm font-medium text-main flex items-center">
              <Eye size={16} className="mr-2" />
              SVG Preview
            </h3>

            {/* SVG Stats */}
            <div className="flex items-center space-x-3 text-xs text-secondary">
              <span>{svgStats.elements} elements</span>
              <span>{svgStats.paths} paths</span>
              <span>{formatFileSize(svgStats.size)}</span>
              {svgStats.viewBox && (
                <span title={`ViewBox: ${svgStats.viewBox}`}>
                  📐 {svgStats.viewBox.split(' ').slice(2).join('×')}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-1 bg-element rounded-md p-1">
              <button
                onClick={handleZoomOut}
                className="p-1 hover:bg-element-hover rounded transition-colors"
                title="Zoom Out"
                disabled={zoom <= 0.1}
              >
                <Minus size={14} />
              </button>
              <span className="text-xs text-main px-2 min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 hover:bg-element-hover rounded transition-colors"
                title="Zoom In"
                disabled={zoom >= 5}
              >
                <PlusCircle size={14} />
              </button>
              <button
                onClick={handleZoomReset}
                className="p-1 hover:bg-element-hover rounded transition-colors"
                title="Reset View"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* Inspector Toggle */}
            <button
              onClick={() => setShowInspector(!showInspector)}
              className={`p-2 rounded transition-colors ${showInspector
                ? 'bg-primary text-white'
                : 'bg-element text-main hover:bg-element-hover'
                }`}
              title={showInspector ? 'Hide Inspector' : 'Show Inspector'}
            >
              <Info size={14} />
            </button>

            {/* Optimization and Format Buttons */}
            <button
              onClick={() => handleOptimize()}
              disabled={isOptimizing}
              className="flex items-center space-x-2 px-3 py-2 bg-success hover:bg-success/80 disabled:bg-element disabled:cursor-not-allowed text-white rounded transition-colors"
              title="Optimize SVG"
            >
              {isOptimizing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Zap size={14} />
              )}
              <span className="text-xs">Optimize</span>
            </button>

            <button
              onClick={handleFormat}
              className="flex items-center space-x-2 px-3 py-2 bg-primary hover:bg-primary/80 text-white rounded transition-colors"
              title="Format SVG"
            >
              <AlignLeft size={14} />
              <span className="text-xs">Format</span>
            </button>

            {/* Export Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handleCopy}
                className={`p-2 rounded transition-colors ${copySuccess
                  ? 'bg-success text-white'
                  : 'bg-element hover:bg-element-hover text-main'
                  }`}
                title={copySuccess ? "Copied!" : "Copy SVG Code"}
              >
                {copySuccess ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                onClick={handleExportSvg}
                className="p-2 bg-element hover:bg-element-hover text-main rounded transition-colors"
                title="Export as SVG"
              >
                <Download size={14} />
              </button>
              <button
                onClick={handleExportPng}
                className="p-2 bg-element hover:bg-element-hover text-main rounded transition-colors"
                title="Export as PNG"
              >
                <ImageIcon size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Optimization Result */}
        {optimizationResult && (
          <div className="mt-3 p-2 bg-success-subtle border border-success/50 rounded-md">
            <div className="flex items-center space-x-2 text-success">
              <CheckCircle size={14} />
              <span className="text-xs">
                Optimized: {formatFileSize(optimizationResult.originalSize)} → {formatFileSize(optimizationResult.optimizedSize)}
                {optimizationResult.savings > 0 && (
                  <span className="ml-2 font-medium">
                    ({optimizationResult.savings.toFixed(1)}% smaller)
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* SVG Preview */}
        <div className="flex-1 relative overflow-hidden bg-canvas">
          <div
            ref={svgContainerRef}
            className="w-full h-full overflow-auto custom-scrollbar cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
          >
            <div
              className="min-w-full min-h-full flex items-center justify-center p-4"
              style={{
                transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
            >
              <div
                data-testid="svg-container"
                className="bg-white rounded-lg shadow-lg p-4 max-w-full max-h-full overflow-visible"
                onClick={handleSvgClick}
                dangerouslySetInnerHTML={{ __html: sanitizeSvg(enhancedSvgContent) }}
                style={{
                  minWidth: '200px',
                  minHeight: '200px',
                }}
              />
            </div>
          </div>

          {/* Pan/Zoom Instructions */}
          <div className="absolute bottom-4 left-4 bg-surface/90 text-main text-xs px-2 py-1 rounded">
            Click & drag to pan • Scroll to zoom • Click elements to inspect
          </div>
        </div>

        {/* Element Inspector Panel */}
        {showInspector && (
          <div className="w-80 bg-surface border-l border-base flex flex-col">
            <div className="flex-shrink-0 p-3 border-b border-base">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-main">Element Inspector</h4>
                <button
                  onClick={() => setShowInspector(false)}
                  className="p-1 hover:bg-element-hover rounded transition-colors"
                  title="Close Inspector"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              {selectedElement ? (
                <div className="p-3 space-y-4">
                  {/* Element Header */}
                  <div className="bg-element/50 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-info font-mono text-sm">
                        &lt;{selectedElement.tagName}&gt;
                      </span>
                      {selectedElement.id && (
                        <span className="text-success text-xs">
                          #{selectedElement.id}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-secondary">
                      Data ID: {selectedElement.dataId}
                    </div>
                  </div>

                  {/* Attributes */}
                  <div>
                    <h5 className="text-xs font-medium text-main mb-2 uppercase tracking-wide">
                      Attributes
                    </h5>
                    {Object.keys(selectedElement.attributes).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(selectedElement.attributes).map(([key, value]) => (
                          <div key={key} className="bg-element/30 rounded p-2">
                            <div className="flex items-start justify-between">
                              <span className="text-xs font-mono text-info">{key}</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(value)}
                                className="p-1 hover:bg-element-hover rounded transition-colors ml-2"
                                title="Copy Value"
                              >
                                <Copy size={10} />
                              </button>
                            </div>
                            <div className="text-xs text-main mt-1 break-all font-mono">
                              {value.length > 50 ? `${value.substring(0, 50)}...` : value}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted italic">No attributes</p>
                    )}
                  </div>

                  {/* Element-specific insights */}
                  {selectedElement.tagName === 'path' && selectedElement.attributes.d && (
                    <div>
                      <h5 className="text-xs font-medium text-main mb-2 uppercase tracking-wide">
                        Path Analysis
                      </h5>
                      <div className="bg-element/30 rounded p-2 text-xs text-main">
                        <div>Commands: {(selectedElement.attributes.d.match(/[MLHVCSQTAZ]/gi) || []).length}</div>
                        <div>Length: {selectedElement.attributes.d.length} chars</div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 text-center text-muted">
                  <Info size={32} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Click any element in the SVG to inspect it</p>
                  <p className="text-xs mt-2">
                    The corresponding code will be highlighted in the editor
                  </p>
                </div>
              )}
            </div>

            {/* SVG Statistics */}
            <div className="flex-shrink-0 p-3 border-t border-base bg-surface/50">
              <h5 className="text-xs font-medium text-main mb-2 uppercase tracking-wide">
                Document Stats
              </h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-secondary">Elements:</div>
                <div className="text-main">{svgStats.elements}</div>
                <div className="text-secondary">Paths:</div>
                <div className="text-main">{svgStats.paths}</div>
                <div className="text-secondary">Groups:</div>
                <div className="text-main">{svgStats.groups}</div>
                <div className="text-secondary">Size:</div>
                <div className="text-main">{formatFileSize(svgStats.size)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {svgError && (
        <div className="absolute top-16 left-4 right-4 bg-danger-subtle border border-danger rounded-md p-3">
          <div className="flex items-center space-x-2 text-danger">
            <AlertTriangle size={14} />
            <span className="text-sm">{svgError}</span>
          </div>
        </div>
      )}
    </div>
  );
};