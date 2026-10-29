import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ReconcileRow } from "./types";

const ROW_HEIGHT = 36;
const COLUMNS = "grid grid-cols-[4rem_5rem_minmax(0,1fr)]";

/** Renders only the rows in view, so very large result sets do not freeze the page. */
export const ReconcilePreviewTable: React.FC<{ rows: ReconcileRow[] }> = ({ rows }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  return <div className="mt-4 rounded border border-base" role="table" aria-label="Selected lines" aria-rowcount={rows.length}>
    <div role="row" className={`${COLUMNS} bg-surface-secondary text-left text-sm font-semibold`}>
      <span role="columnheader" className="p-2">Source</span><span role="columnheader" className="p-2">Row</span><span role="columnheader" className="p-2">Preview</span>
    </div>
    <div ref={scrollRef} data-testid="reconcile-preview-scroll" className="max-h-[28rem] overflow-auto custom-scrollbar">
      <div className="relative" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((item) => {
          const row = rows[item.index];
          return <div
            key={`${row.source}-${row.rowNumber}`}
            role="row"
            className={`${COLUMNS} absolute left-0 top-0 w-full border-t border-base text-sm`}
            style={{ height: `${ROW_HEIGHT}px`, transform: `translateY(${item.start}px)` }}
          >
            <span role="cell" className="p-2">{row.source}</span><span role="cell" className="p-2">{row.rowNumber}</span><span role="cell" className="truncate p-2 font-mono">{row.text}</span>
          </div>;
        })}
      </div>
    </div>
  </div>;
};
