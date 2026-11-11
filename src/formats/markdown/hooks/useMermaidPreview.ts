import { useEffect, useState } from "react";
import { useDebounce } from "../../../hooks/useDebounce";
import { useThemeStore } from "../../../stores/themeStore";

/**
 * Standalone mermaid loader/renderer for the Markdown preview. Deliberately
 * does not import from src/tablets/diagram - tablets stay self-contained, so
 * this duplicates only the minimal CDN-load-and-render logic, not the
 * tablet's error-suggestion/template/toolbar machinery.
 */

const MERMAID_CDN_URLS = [
  "https://unpkg.com/mermaid@10.6.1/dist/mermaid.min.js",
  "https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js",
] as const;

const RENDER_DEBOUNCE_MS = 300;

interface MermaidInstance {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, code: string) => Promise<{ svg: string }>;
}

declare global {
  interface Window {
    mermaid?: MermaidInstance;
  }
}

let mermaidLoadPromise: Promise<MermaidInstance> | null = null;

function loadMermaid(): Promise<MermaidInstance> {
  if (typeof window !== "undefined" && window.mermaid) {
    return Promise.resolve(window.mermaid);
  }
  if (mermaidLoadPromise) return mermaidLoadPromise;

  mermaidLoadPromise = new Promise((resolve, reject) => {
    const tryLoadFromCDN = (url: string, isLastTry: boolean) => {
      const script = document.createElement("script");
      script.src = url;
      script.onload = () => {
        const mermaid = window.mermaid;
        if (mermaid) {
          resolve(mermaid);
        } else {
          reject(new Error("Mermaid object not found after loading"));
        }
      };
      script.onerror = () => {
        script.remove();
        if (!isLastTry) {
          tryLoadFromCDN(MERMAID_CDN_URLS[1], true);
        } else {
          reject(new Error("Failed to load Mermaid from all CDN sources"));
        }
      };
      document.head.appendChild(script);
    };

    tryLoadFromCDN(MERMAID_CDN_URLS[0], false);
  });

  return mermaidLoadPromise;
}

// Mermaid renders into a detached `d{id}` div in <body> when no target
// container is given; clean it up so failed/superseded renders don't leak.
function cleanupOrphanedRenderNode(id: string): void {
  const node = document.getElementById(`d${id}`);
  if (node?.parentElement === document.body) node.remove();
}

let renderCounter = 0;

interface MermaidPreviewResult {
  svg: string | null;
  error: string | null;
  isLoading: boolean;
}

/** Renders mermaid source to SVG. Pass an empty string to skip loading/rendering entirely. */
export function useMermaidPreview(code: string): MermaidPreviewResult {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const debouncedCode = useDebounce(code, RENDER_DEBOUNCE_MS);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmed = debouncedCode.trim();
    if (!trimmed) {
      setSvg(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const id = `md-mermaid-${++renderCounter}`;
    setIsLoading(true);

    loadMermaid()
      .then((mermaid) => {
        if (cancelled) return null;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: isDarkMode ? "dark" : "default",
        });
        return mermaid.render(id, trimmed);
      })
      .then((result) => {
        if (cancelled || !result) return;
        cleanupOrphanedRenderNode(id);
        setSvg(result.svg);
        setError(null);
      })
      .catch((err: unknown) => {
        cleanupOrphanedRenderNode(id);
        if (cancelled) return;
        setSvg(null);
        setError(err instanceof Error ? err.message : "Failed to render diagram");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedCode, isDarkMode]);

  return { svg, error, isLoading };
}
