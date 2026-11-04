import React, { useState, useMemo } from "react";
import { BaseModal } from "../../../../components/Modals/BaseModal";
import { CsvOptions, convertToCsv } from "../../utils/generateCsv";
import { Editor } from "@monaco-editor/react";
import { Download, Copy, Check, Info } from "lucide-react";
import { useThemeStore } from "../../../../stores/themeStore";

interface CsvExportOptionsModalProps {
  jsonString: string;
  onClose: () => void;
}

/**
 * Modal for configuring and previewing CSV export from JSON.
 * Provides intelligent flattening options and real-time preview.
 */
export const CsvExportOptionsModal: React.FC<CsvExportOptionsModalProps> = ({
  jsonString,
  onClose,
}) => {
  const { isDarkMode } = useThemeStore();
  const [options, setOptions] = useState<CsvOptions>({
    delimiter: ",",
    includeHeaders: true,
    arrayExpansion: "expandFirst",
  });
  const [isCopied, setIsCopied] = useState(false);

  // Generate CSV with current options
  const { csv, rowCount, error } = useMemo(() => {
    try {
      return convertToCsv(jsonString, options);
    } catch (e: any) {
      return { csv: "", rowCount: 0, error: e.message || "Unknown error" };
    }
  }, [jsonString, options]);

  const handleDownload = () => {
    if (!csv || error) return;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "export.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!csv || error) return;

    try {
      await navigator.clipboard.writeText(csv);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  // Get strategy description
  const getStrategyDescription = (strategy: string): string => {
    switch (strategy) {
      case "expandFirst":
        return "Expands only the first array found in each object. Other arrays are stringified. Safest option that prevents row explosion.";
      case "expandAll":
        return "Expands all arrays, creating a Cartesian product. Can create many rows if multiple arrays exist. Use carefully!";
      case "stringify":
        return "Legacy mode. All arrays are stringified as JSON. No intelligent expansion.";
      default:
        return "";
    }
  };

  return (
    <BaseModal
      title="CSV Export Options"
      onClose={onClose}
      maxWidthClass="max-w-5xl"
      maxHeightClass="max-h-[90vh]"
    >
      <div className="flex flex-col p-4 space-y-4" style={{ height: "80vh" }}>
        {/* Options Panel */}
        <div className="flex-none">
          <h3 className="text-sm font-medium text-secondary mb-3">
            Export Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-element rounded-lg border border-base">
            {/* Array Expansion Strategy */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-secondary mb-2">
                Array Expansion Strategy
              </label>
              <select
                value={options.arrayExpansion}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    arrayExpansion: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 bg-element text-main border border-base rounded text-sm focus:outline-none focus:ring-2 focus:border-focus"
              >
                <option value="expandFirst">
                  Expand First Array Only (Recommended)
                </option>
                <option value="expandAll">
                  Expand All Arrays (Cartesian Product)
                </option>
                <option value="stringify">Stringify All Arrays (Legacy)</option>
              </select>

              {/* Strategy Description */}
              <div className="mt-2 p-3 bg-info-subtle border border-info rounded">
                <div className="flex items-start">
                  <Info size={16} className="mr-2 mt-0.5 text-info flex-shrink-0" />
                  <p className="text-xs text-info">
                    {getStrategyDescription(options.arrayExpansion)}
                  </p>
                </div>
              </div>
            </div>

            {/* Delimiter */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Delimiter
              </label>
              <select
                value={options.delimiter === "\t" ? "tab" : "comma"}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    delimiter: e.target.value === "tab" ? "\t" : ","
                  })
                }
                className="w-full px-3 py-2 bg-element text-main border border-base rounded text-sm focus:outline-none focus:ring-2 focus:border-focus"
              >
                <option value="comma">Comma (,)</option>
                <option value="tab">Tab</option>
              </select>
            </div>

            {/* Include Headers */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Include Headers
              </label>
              <div className="flex items-center h-[38px]">
                <input
                  type="checkbox"
                  checked={options.includeHeaders}
                  onChange={(e) =>
                    setOptions({ ...options, includeHeaders: e.target.checked })
                  }
                  className="w-4 h-4 text-primary bg-element border border-base rounded focus:ring-2 focus:border-focus"
                />
                <span className="ml-2 text-sm text-secondary">
                  Add header row
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 flex flex-col" style={{ minHeight: "500px" }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-secondary">
              CSV Preview
              {csv && !error && (
                <span className="ml-2 text-xs text-muted">
                  ({rowCount} {rowCount === 1 ? "row" : "rows"})
                </span>
              )}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                disabled={!csv || !!error}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-md transition-colors text-secondary hover:bg-element-hover disabled:opacity-50 disabled:cursor-not-allowed"
                title="Copy to clipboard"
              >
                {isCopied ? (
                  <>
                    <Check size={16} className="text-success" />
                    <span className="text-xs">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span className="text-xs">Copy</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                disabled={!csv || !!error}
                className="flex items-center space-x-1 px-3 py-1.5 bg-primary text-main rounded-md hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download CSV file"
              >
                <Download size={16} />
                <span className="text-xs">Download</span>
              </button>
            </div>
          </div>

          <div className="flex-1 border border-base rounded-lg overflow-hidden" style={{ minHeight: "450px" }}>
            <Editor
              height="100%"
              language="csv"
              value={error ? `# Error: ${error}` : csv}
              theme={isDarkMode ? "vs-dark" : "vs"}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 12,
                wordWrap: "off",
                scrollBeyondLastLine: false,
                lineNumbers: "on",
              }}
            />
          </div>
        </div>

        {/* Info Footer */}
        <div className="flex-none pt-3 border-t border-base">
          <div className="text-xs text-secondary">
            <span className="font-medium">Tip:</span> The export intelligently
            flattens nested objects (e.g., user.name → user.name column). Arrays
            create multiple rows with duplicated parent data, making the CSV
            fully filterable and usable in spreadsheets.
          </div>
        </div>
      </div>
    </BaseModal>
  );
};
