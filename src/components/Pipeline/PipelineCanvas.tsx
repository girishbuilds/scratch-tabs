/**
 * Pipeline Canvas Component
 *
 * Middle panel showing the pipeline steps.
 * Supports drag-and-drop reordering, enable/disable, and parameter editing.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  GripVertical,
  X,
  ChevronDown,
  ChevronRight,
  Check,
  AlertCircle,
  AlertTriangle,
  Clock,
} from "../Icons";
import { PipelineStep, StepResult } from "../../services/pipeline/types";
import { operationRegistry } from "../../services/pipeline";
import { OperationParamField } from "./OperationParamField";

interface PipelineCanvasProps {
  steps: PipelineStep[];
  onUpdateStep: (stepId: string, updates: Partial<PipelineStep>) => void;
  onRemoveStep: (stepId: string) => void;
  onReorderSteps: (newSteps: PipelineStep[]) => void;
  stepResults?: StepResult[];
}

export const PipelineCanvas: React.FC<PipelineCanvasProps> = ({
  steps,
  onUpdateStep,
  onRemoveStep,
  onReorderSteps,
  stepResults,
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Track which step IDs we've seen to detect newly added steps
  const seenStepIds = useRef<Set<string>>(new Set());

  // Auto-expand newly added steps that have parameters
  useEffect(() => {
    const newSteps = steps.filter((step) => !seenStepIds.current.has(step.id));

    if (newSteps.length > 0) {
      const stepsWithParams = newSteps.filter((step) => {
        const operation = operationRegistry.getById(step.operationId);
        return operation && operation.parameters.length > 0;
      });

      if (stepsWithParams.length > 0) {
        setExpandedSteps((prev) => {
          const next = new Set(prev);
          stepsWithParams.forEach((step) => next.add(step.id));
          return next;
        });
      }

      // Mark all current steps as seen
      steps.forEach((step) => seenStepIds.current.add(step.id));
    }
  }, [steps]);

  // Toggle step expansion
  const toggleExpanded = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  // Handle drag start
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const newSteps = [...steps];
      const [removed] = newSteps.splice(draggedIndex, 1);
      newSteps.splice(dropIndex, 0, removed);
      onReorderSteps(newSteps);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Get step result
  const getStepResult = (stepId: string): StepResult | undefined => {
    return stepResults?.find((r) => r.stepId === stepId);
  };

  if (steps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center p-4">
        <div className="text-muted">
          <div className="text-lg mb-2">No steps yet</div>
          <div className="text-sm">
            Click an operation from the left panel to add it to the pipeline
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const operation = operationRegistry.getById(step.operationId);
        const result = getStepResult(step.id);
        const isExpanded = expandedSteps.has(step.id);
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index;

        return (
          <div
            key={step.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              border rounded-lg transition-all
              ${isDragging ? "opacity-50" : ""}
              ${isDragOver ? "border-primary border-2" : "border-base"}
              ${step.enabled ? "bg-surface" : "bg-surface-secondary opacity-60"}
            `}
          >
            {/* Step Header */}
            <div className="flex items-center p-2 gap-2">
              {/* Drag Handle */}
              <div className="cursor-grab text-muted hover:text-main">
                <GripVertical className="w-4 h-4" />
              </div>

              {/* Step Number */}
              <div className="w-5 h-5 rounded-full bg-element flex items-center justify-center text-xs text-muted">
                {index + 1}
              </div>

              {/* Enable/Disable Toggle */}
              <button
                onClick={() =>
                  onUpdateStep(step.id, { enabled: !step.enabled })
                }
                className={`
                  w-5 h-5 rounded border flex items-center justify-center transition-colors
                  ${step.enabled ? "bg-success border-success text-white" : "border-base text-muted hover:border-success"}
                `}
                title={step.enabled ? "Disable step" : "Enable step"}
              >
                {step.enabled && <Check className="w-3 h-3" />}
              </button>

              {/* Operation Name */}
              <button
                onClick={() => toggleExpanded(step.id)}
                className="flex-1 flex items-center gap-2 text-left min-w-0"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted flex-shrink-0" />
                )}
                <span className="text-sm text-main truncate">
                  {operation?.name || step.operationId}
                </span>
              </button>

              {/* Status Icon */}
              {result && (
                <div className="flex-shrink-0">
                  {result.skipped ? (
                    <span className="text-xs text-muted">Skipped</span>
                  ) : result.error ? (
                    <AlertCircle
                      className="w-4 h-4 text-danger"
                      aria-label="Step failed"
                      data-testid="step-status-error"
                    />
                  ) : result.warning ? (
                    <AlertTriangle
                      className="w-4 h-4 text-warning"
                      aria-label="Step warning"
                      data-testid="step-status-warning"
                    />
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-muted">
                      <Clock className="w-3 h-3" />
                      {result.duration.toFixed(0)}ms
                    </div>
                  )}
                </div>
              )}

              {/* Remove Button */}
              <button
                onClick={() => onRemoveStep(step.id)}
                className="p-1 text-muted hover:text-danger rounded transition-colors flex-shrink-0"
                title="Remove step"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Parameters (Expanded) */}
            {isExpanded && operation && (operation.parameters.length > 0 || operation.processingMode === "configurable") && (
              <div className="px-3 pb-3 pt-1 border-t border-base space-y-2">
                {/* Configurable Processing Mode Toggle */}
                {operation.processingMode === "configurable" && (
                  <div className="pb-2 mb-2 border-b border-base/50">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={step.applyPerLine || false}
                        onChange={(e) =>
                          onUpdateStep(step.id, {
                            applyPerLine: e.target.checked,
                          })
                        }
                        onDragStart={(e) => e.stopPropagation()}
                        draggable="false"
                        className="rounded border-base text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-medium text-main">Apply per line</span>
                    </label>
                    <p className="text-[10px] text-muted ml-6">
                      Split input by newlines and process each line independently
                    </p>
                  </div>
                )}

                {operation.parameters.map((param) => (
                  // Drag-stop wrapper keeps drag-and-drop from firing inside inputs
                  <div
                    key={param.name}
                    onDragStart={(e) => e.stopPropagation()}
                    draggable="false"
                  >
                    <OperationParamField
                      param={param}
                      value={step.params[param.name]}
                      onChange={(value) =>
                        onUpdateStep(step.id, {
                          params: { ...step.params, [param.name]: value },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Warning Message */}
            {!result?.error && result?.warning && (
              <div className="px-3 pb-3 pt-1 border-t border-warning/20">
                <div className="text-xs text-warning" data-testid="step-warning-message">
                  {result.warning}
                </div>
              </div>
            )}

            {/* Error Message */}
            {result?.error && (
              <div className="px-3 pb-3 pt-1 border-t border-danger/20">
                <div className="text-xs text-danger">{result.error}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
