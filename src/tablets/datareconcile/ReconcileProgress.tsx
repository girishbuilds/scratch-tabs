import React from "react";
import { Loader2 } from "../../components/Icons";

export const ReconcileProgress: React.FC = () => (
  <div role="status" aria-live="polite" data-testid="reconcile-progress" className="mt-5 flex items-center gap-3 rounded border border-base bg-surface p-3 text-sm">
    <Loader2 size={16} className="shrink-0 animate-spin text-accent" aria-hidden />
    <div>
      <p className="font-medium">Comparing sources...</p>
      <p className="text-secondary">Large files can take a moment. You can switch tabs and the result will be kept.</p>
    </div>
  </div>
);
