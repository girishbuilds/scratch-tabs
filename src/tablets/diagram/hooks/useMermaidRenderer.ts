import { useState, useEffect, useCallback, useRef } from 'react';
import { DiagramError, MermaidRenderResult, MermaidTheme } from '../types';

// Constants
const DEBOUNCE_DELAY = 300;
const CLEANUP_DELAY = 50;
const MIN_DIAGRAM_WIDTH = 400;
const MIN_DIAGRAM_HEIGHT = 300;
const SMALL_DIAGRAM_THRESHOLD = { width: 300, height: 200 };
const DEFAULT_DIMENSIONS = { width: '500px', height: '350px' };

// Diagram type patterns for detection
const DIAGRAM_TYPE_PATTERNS = {
  class: /^\s*classDiagram/i,
  sequence: /^\s*sequenceDiagram/i,
  flowchart: /^\s*(flowchart|graph)\s+(TD|TB|BT|RL|LR)/i,
  gantt: /^\s*gantt/i,
  pie: /^\s*pie/i,
  journey: /^\s*journey/i,
  gitgraph: /^\s*gitGraph/i,
  er: /^\s*erDiagram/i,
  mindmap: /^\s*mindmap/i,
  timeline: /^\s*timeline/i,
  quadrant: /^\s*quadrantChart/i,
  requirement: /^\s*requirementDiagram/i
} as const;

type DiagramType = keyof typeof DIAGRAM_TYPE_PATTERNS;

const MERMAID_CDN_URLS = [
  'https://unpkg.com/mermaid@10.6.1/dist/mermaid.min.js',
  'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js'
] as const;

const DEFAULT_MERMAID_CONFIG = {
  startOnLoad: false,
  securityLevel: 'strict',
  fontFamily: 'Inter, system-ui, sans-serif',
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
    padding: 15
  },
  sequence: {
    useMaxWidth: true,
    wrap: true,
    width: 150
  },
  class: {
    padding: 15
  },
  state: {
    padding: 15
  },
  er: {
    padding: 15
  },
  gantt: { useMaxWidth: true },
  journey: { useMaxWidth: true },
  gitgraph: { useMaxWidth: true },
  pie: { useMaxWidth: true },
  quadrantChart: { useMaxWidth: true },
  requirement: { useMaxWidth: true },
  mindmap: { useMaxWidth: true }
} as const;

interface UseMermaidRendererProps {
  code: string;
  theme: MermaidTheme;
  onError?: (error: DiagramError | null) => void;
  onRenderComplete?: (result: MermaidRenderResult) => void;
}


/**
 * Detects the type of Mermaid diagram from the code
 */
const detectDiagramType = (code: string): DiagramType | null => {
  const lines = code.trim().split('\n');
  const firstLine = lines[0]?.trim() || '';
  
  for (const [type, pattern] of Object.entries(DIAGRAM_TYPE_PATTERNS)) {
    if (pattern.test(firstLine)) {
      return type as DiagramType;
    }
  }
  
  return null;
};

/**
 * Provides intelligent error suggestions based on diagram type and error patterns
 */
const getIntelligentErrorSuggestion = (message: string, code: string): string => {
  const diagramType = detectDiagramType(code);
  const lowerMessage = message.toLowerCase();
  
  // Lexical errors in class diagrams - check for common syntax issues
  if (lowerMessage.includes('lexical error') && diagramType === 'class') {
    // Check for incorrect attribute syntax: +Type name instead of +name: Type
    const hasIncorrectAttributeSyntax = /\+\s*[A-Z][a-zA-Z]*\s+[a-z][a-zA-Z]*/.test(code);
    if (hasIncorrectAttributeSyntax) {
      return 'Class diagram attributes use UML syntax: `+name: Type`, not `+Type name`. Change `+String id` to `+id: String`. This error can cascade and appear to occur on relationship lines even though the actual issue is in the class definitions above.';
    }
    
    // Check for unquoted relationship labels
    if (lowerMessage.includes('unrecognized text') || code.includes('||--') || code.includes('--')) {
      return 'In class diagrams, relationship labels must be enclosed in double quotes. Change `ClassA -- ClassB : label` to `ClassA -- ClassB : "label"`. Check all your relationship definitions for missing quotes.';
    }
  }
  
  // ER diagram specific issues
  if (diagramType === 'er' && lowerMessage.includes('lexical')) {
    return 'In ER diagrams, check that all relationships use proper syntax like `CUSTOMER ||--o{ ORDER : "places"` with quoted labels and correct cardinality symbols.';
  }
  
  // Flowchart/graph specific issues
  if (diagramType === 'flowchart' && lowerMessage.includes('arrow')) {
    return 'In flowcharts, use --> for arrows, -.-> for dotted arrows, and ==> for thick arrows. Node connections must be properly formatted like `A --> B`.';
  }
  
  // Sequence diagram specific issues
  if (diagramType === 'sequence') {
    if (lowerMessage.includes('arrow') || lowerMessage.includes('participant')) {
      return 'In sequence diagrams, use ->> for solid arrows, -->> for dotted arrows. Participants should be declared first: `participant A` then use arrows like `A->>B: message`.';
    }
  }
  
  // Gantt chart specific issues
  if (diagramType === 'gantt') {
    if (lowerMessage.includes('date') || lowerMessage.includes('task')) {
      return 'In Gantt charts, dates should be in YYYY-MM-DD format and tasks must follow the syntax: `task1 :done, des1, 2014-01-06,2014-01-08`.';
    }
  }
  
  // Generic suggestions based on error type
  if (lowerMessage.includes('arrow')) {
    return 'Check arrow syntax. Use --> for solid arrows, -.-> for dotted arrows. Ensure proper spacing around arrows.';
  }
  
  if (lowerMessage.includes('node')) {
    return 'Check node syntax. Use proper brackets: [] for rectangles, () for rounded rectangles, {} for diamonds.';
  }
  
  if (lowerMessage.includes('syntax') || lowerMessage.includes('parse')) {
    return 'Check diagram syntax. Ensure proper indentation, valid Mermaid keywords, and correct diagram-specific formatting.';
  }
  
  return 'Check the Mermaid documentation for valid syntax patterns specific to your diagram type.';
};

/**
 * Determines if an element is an unwanted Mermaid div that should be removed
 */
const isUnwantedMermaidDiv = (element: Element): boolean => {
  const isDirectBodyChild = element.parentElement === document.body;
  const containsErrorContent = element.innerHTML.includes('<svg') && 
    (element.innerHTML.includes('Syntax error') || 
     element.innerHTML.includes('error-text') ||
     element.innerHTML.includes('aria-roledescription="error"'));
  
  return isDirectBodyChild && containsErrorContent;
};

/**
 * Cleans up unwanted DOM elements that Mermaid.js injects into the body
 * Mermaid creates a div with ID "d{id}" when the target element doesn't exist
 */
const cleanupUnwantedMermaidDiv = (diagramId: string): void => {
  const unwantedDivId = `d${diagramId}`;
  
  const attemptCleanup = () => {
    const unwantedDiv = document.getElementById(unwantedDivId);
    if (unwantedDiv && isUnwantedMermaidDiv(unwantedDiv)) {
      unwantedDiv.remove();
    }
  };

  // Immediate cleanup
  attemptCleanup();
  
  // Delayed cleanup for asynchronously created elements
  setTimeout(attemptCleanup, CLEANUP_DELAY);
};

// Extra padding added to every side of the viewBox so Mermaid's slightly
// under-calculated label bounds don't get clipped by the SVG overflow boundary.
const VIEWBOX_PADDING = 8;

/**
 * Processes SVG to improve sizing - ensures small diagrams are visible while large ones fit container
 */
const processSvgForBetterSizing = (svg: string): string => {
  try {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg');

    if (!svgElement) return svg;

    // Get the viewBox to understand content dimensions
    const viewBox = svgElement.getAttribute('viewBox');
    if (viewBox) {
      const [x, y, width, height] = viewBox.split(' ').map(Number);

      // Expand the viewBox by VIEWBOX_PADDING on every side so label text that
      // Mermaid slightly under-estimates is not clipped by the SVG element itself.
      const paddedX = x - VIEWBOX_PADDING;
      const paddedY = y - VIEWBOX_PADDING;
      const paddedWidth = width + VIEWBOX_PADDING * 2;
      const paddedHeight = height + VIEWBOX_PADDING * 2;

      // Determine if this is a small diagram that needs minimum sizing
      const isSmallDiagram = paddedWidth < SMALL_DIAGRAM_THRESHOLD.width || paddedHeight < SMALL_DIAGRAM_THRESHOLD.height;

      if (isSmallDiagram) {
        // For small diagrams, enforce minimum dimensions to ensure visibility
        const finalWidth = Math.max(paddedWidth, MIN_DIAGRAM_WIDTH);
        const finalHeight = Math.max(paddedHeight, MIN_DIAGRAM_HEIGHT);

        // Center the content in the expanded viewBox
        const newX = paddedX - (finalWidth - paddedWidth) / 2;
        const newY = paddedY - (finalHeight - paddedHeight) / 2;

        svgElement.setAttribute('viewBox', `${newX} ${newY} ${finalWidth} ${finalHeight}`);
        svgElement.setAttribute('width', `${finalWidth}px`);
        svgElement.setAttribute('height', `${finalHeight}px`);
      } else {
        // For larger diagrams, remove fixed dimensions and set up responsive scaling
        svgElement.setAttribute('viewBox', `${paddedX} ${paddedY} ${paddedWidth} ${paddedHeight}`);
        svgElement.removeAttribute('width');
        svgElement.removeAttribute('height');

        // Set preserveAspectRatio to ensure proper scaling
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }
    } else {
      // If no viewBox, set reasonable default dimensions
      svgElement.setAttribute('width', DEFAULT_DIMENSIONS.width);
      svgElement.setAttribute('height', DEFAULT_DIMENSIONS.height);
    }
    
    // Apply CSS for aggressive containment - force SVG to fit container
    svgElement.style.maxWidth = '100%';
    svgElement.style.maxHeight = '100%';
    svgElement.style.width = '100%';
    svgElement.style.height = '100%';
    svgElement.style.display = 'block';
    svgElement.style.objectFit = 'contain';
    svgElement.style.objectPosition = 'center';
    
    return new XMLSerializer().serializeToString(svgDoc);
  } catch {
    return svg;
  }
};

/**
 * Custom hook for rendering Mermaid diagrams with Web Worker support
 * Provides bidirectional syncing and intelligent error handling
 */
export const useMermaidRenderer = ({
  code,
  theme,
  onError,
  onRenderComplete
}: UseMermaidRendererProps) => {
  const [renderedSvg, setRenderedSvg] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [elementMap, setElementMap] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState<DiagramError | null>(null);
  
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Global reference to prevent multiple loads
   */
  const loadMermaidPromise = useRef<Promise<any> | null>(null);

  /**
   * Loads Mermaid library dynamically in main thread with proper singleton handling
   */
  const loadMermaid = useCallback(async () => {
    // Return existing Mermaid instance if already loaded
    if (typeof window !== 'undefined' && (window as any).mermaid) {
      return (window as any).mermaid;
    }

    // Return existing loading promise to prevent multiple simultaneous loads
    if (loadMermaidPromise.current) {
      return loadMermaidPromise.current;
    }

    // Check if script is already being loaded or exists
    const existingScript = document.querySelector('script[src*="mermaid"]');
    if (existingScript && (window as any).mermaid) {
      return (window as any).mermaid;
    }

    // Create new loading promise
    loadMermaidPromise.current = new Promise((resolve, reject) => {
      // Temporarily disable AMD to prevent conflicts
      const originalDefine = (window as any).define;
      const originalRequire = (window as any).require;
      
      if (originalDefine) {
        (window as any).define = undefined;
      }
      if (originalRequire) {
        (window as any).require = undefined;
      }

      const restoreAMD = () => {
        if (originalDefine) {
          (window as any).define = originalDefine;
        }
        if (originalRequire) {
          (window as any).require = originalRequire;
        }
      };

      const tryLoadFromCDN = (url: string, isLastTry = false) => {
        const script = document.createElement('script');
        script.src = url;
        script.type = 'text/javascript';
        
        script.onload = () => {
          restoreAMD();
          
          if ((window as any).mermaid) {
            (window as any).mermaid.initialize({
              ...DEFAULT_MERMAID_CONFIG,
              theme: 'dark'
            });
            resolve((window as any).mermaid);
          } else {
            reject(new Error('Mermaid object not found after loading'));
          }
        };
        
        script.onerror = () => {
          script.remove();
          
          if (!isLastTry) {
            // Try fallback CDN
            tryLoadFromCDN(MERMAID_CDN_URLS[1], true);
          } else {
            restoreAMD();
            reject(new Error('Failed to load Mermaid from all CDN sources'));
          }
        };
        
        document.head.appendChild(script);
      };

      // Start loading from primary CDN
      tryLoadFromCDN(MERMAID_CDN_URLS[0]);
    });

    return loadMermaidPromise.current;
  }, []);


  /**
   * Renders the Mermaid diagram using main thread
   */
  const renderDiagram = useCallback(async (diagramCode: string, diagramTheme: MermaidTheme) => {
    if (!diagramCode.trim()) {
      setRenderedSvg(null);
      setError(null);
      setElementMap(new Map());
      return;
    }

    setIsRendering(true);
    setError(null);

    // Generate diagram ID at function scope so it's accessible in catch block
    const id = `diagram-${Date.now()}`;

    try {
      // Load Mermaid if not already loaded
      const mermaid = await loadMermaid();
      
      // Update theme and configuration if provided
      if (diagramTheme) {
        mermaid.initialize({ 
          ...DEFAULT_MERMAID_CONFIG,
          theme: diagramTheme
        });
      }
      
      // Render the diagram
      const { svg } = await mermaid.render(id, diagramCode);
      
      // Clean up unwanted DOM element that Mermaid.js injects into document.body
      // When rendering succeeds, Mermaid should not create unwanted divs, but cleanup anyway as safety measure
      cleanupUnwantedMermaidDiv(id);
      
      // Check if the SVG contains actual error content (not just CSS definitions)
      const hasErrorText = svg.includes('Syntax error') || svg.includes('Parse error');
      const hasErrorAria = svg.includes('aria-roledescription="error"');
      
      // Flag as error if we have error text content OR error-specific ARIA
      if (hasErrorAria || hasErrorText) {
        // Extract the actual error message from the SVG text content
        const errorMatch = svg.match(/>([^<]*(?:Syntax error|Parse error)[^<]*)</i);
        
        let errorMessage = 'Diagram syntax error';
        if (errorMatch && errorMatch[1]) {
          errorMessage = errorMatch[1].trim();
        }
        
        throw new Error(errorMessage);
      }
      
      // Post-process the SVG to improve sizing
      const processedSvg = processSvgForBetterSizing(svg);
      
      // Create element mapping for click-to-highlight
      const elementMap = new Map();
      const lines = diagramCode.split('\n');
      
      // Parse the processed SVG to create element mappings
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(processedSvg, 'image/svg+xml');
      const elements = svgDoc.querySelectorAll('[id]');
      
      elements.forEach(element => {
        const elementId = element.id;
        // Find corresponding line in code (simplified mapping)
        lines.forEach((line, index) => {
          if (line.includes(elementId) || 
              (element.textContent && line.includes(element.textContent.trim()))) {
            elementMap.set(elementId, index + 1);
          }
        });
      });
      
      // Only update if SVG actually changed to prevent infinite re-renders
      if (renderedSvg !== processedSvg) {
        setRenderedSvg(processedSvg);
        setElementMap(elementMap);
        
        onRenderComplete?.({
          svg: processedSvg,
          elementMap
        });
      }
      setIsRendering(false);
      
    } catch (error: any) {
      // Clean up unwanted DOM element that Mermaid.js injects when errors occur
      cleanupUnwantedMermaidDiv(id);
      
      // Parse Mermaid error for better user feedback
      const errorMessage = error.message || 'Unknown rendering error';
      const lineMatch = errorMessage.match(/line (\d+)/i);
      const line = lineMatch ? parseInt(lineMatch[1]) : 1;
      
      const errorObj: DiagramError = {
        line,
        message: errorMessage,
        type: 'render',
        suggestion: getIntelligentErrorSuggestion(errorMessage, diagramCode)
      };
      
      setError(errorObj);
      setRenderedSvg(null);
      setIsRendering(false);
      onError?.(errorObj);
    }
  }, [loadMermaid, onError, onRenderComplete]);

  /**
   * Debounced rendering to avoid excessive re-renders
   */
  useEffect(() => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = setTimeout(() => {
      renderDiagram(code, theme);
    }, DEBOUNCE_DELAY);

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [code, theme, renderDiagram]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handles clicks on SVG elements for bidirectional syncing
   */
  const handleElementClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as Element;
    
    // Find the nearest element with an ID
    let element: Element | null = target;
    while (element && element !== event.currentTarget) {
      if (element.id && elementMap.has(element.id)) {
        const lineNumber = elementMap.get(element.id);
        return {
          id: element.id,
          lineNumber: lineNumber!,
          elementType: element.tagName.toLowerCase(),
          attributes: Array.from(element.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {} as Record<string, string>)
        };
      }
      element = element.parentElement;
    }
    
    return null;
  }, [elementMap]);

  /**
   * Forces a re-render of the current diagram
   */
  const forceRender = useCallback(() => {
    renderDiagram(code, theme);
  }, [code, theme, renderDiagram]);

  /**
   * Gets statistics about the current diagram
   */
  const getStatistics = useCallback(() => {
    if (!renderedSvg) return null;

    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(renderedSvg, 'image/svg+xml');
    
    const elements = svgDoc.querySelectorAll('*');
    const paths = svgDoc.querySelectorAll('path');
    const texts = svgDoc.querySelectorAll('text');
    const groups = svgDoc.querySelectorAll('g');
    
    return {
      totalElements: elements.length,
      paths: paths.length,
      texts: texts.length,
      groups: groups.length,
      codeLines: code.split('\n').length,
      codeSize: new Blob([code]).size
    };
  }, [renderedSvg, code]);

  return {
    renderedSvg,
    isRendering,
    error,
    elementMap,
    handleElementClick,
    forceRender,
    getStatistics
  };
};