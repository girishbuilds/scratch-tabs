import React, { useEffect, useMemo, useState } from "react";
import { BaseModal } from "../Modals/BaseModal";
import { AlertCircle, ArrowDown, ArrowUp, FileText, Loader2 } from "../Icons";
import { formatRegistry } from "../../formats";
import type {
  MergeInput,
  MergeOptions,
  MergeOptionsUIProps,
  MergeResult,
} from "../../formats/types";
import { captureMergeInputs, joinTabsAsText } from "../../services/tabMerge";
import { useRootStore } from "../../stores/rootStore";
import { useTabsStore } from "../../stores/tabsStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import type { Tab } from "../../types";
import { getTabContentKind } from "../../utils/tabContentKind";

interface MergeTabsModalProps {
  tabId: string;
  isRightSide: boolean;
  onClose: () => void;
}

const PREVIEW_LIMIT = 2000;
const DIAGNOSTIC_LIMIT = 20;

const isMergeableTab = (tab: Tab, workspaceId: string) =>
  tab.workspaceId === workspaceId && getTabContentKind(tab) === "text";

const sameInputs = (left: MergeInput[], right: MergeInput[]) =>
  left.length === right.length &&
  left.every(
    (input, index) =>
      input.id === right[index].id &&
      input.title === right[index].title &&
      input.language === right[index].language &&
      input.content === right[index].content,
  );

export const MergeTabsModal: React.FC<MergeTabsModalProps> = ({
  tabId,
  isRightSide,
  onClose,
}) => {
  const tabs = useTabsStore((state) => state.tabs);
  const createTab = useRootStore((state) => state.handleNewPopulatedTab);
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );
  const clickedTab = tabs.find((tab) => tab.id === tabId);
  const workspaceId = clickedTab?.workspaceId;
  const eligibleTabs = useMemo(
    () => tabs.filter((tab) => workspaceId && isMergeableTab(tab, workspaceId)),
    [tabs, workspaceId],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([tabId]);
  const [title, setTitle] = useState("Merged tabs");
  const [mode, setMode] = useState<"text" | "format">("text");
  const [separatorPreset, setSeparatorPreset] = useState("\n");
  const [customSeparator, setCustomSeparator] = useState("");
  const separator =
    separatorPreset === "custom" ? customSeparator : separatorPreset;
  const [options, setOptions] = useState<MergeOptions>({});
  const [revision, setRevision] = useState(0);
  const [sourceChanged, setSourceChanged] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [OptionsUI, setOptionsUI] =
    useState<React.ComponentType<MergeOptionsUIProps> | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const orderedTabs = useMemo(
    () =>
      selectedIds
        .map((id) => eligibleTabs.find((tab) => tab.id === id))
        .filter((tab): tab is Tab => !!tab),
    [selectedIds, eligibleTabs],
  );
  const previewInputs = useMemo(() => {
    void revision; // Force a fresh live-content snapshot after an apply-time change.
    return captureMergeInputs(orderedTabs);
  }, [orderedTabs, revision]);
  const commonLanguage =
    previewInputs.length >= 2 &&
    previewInputs.every((input) => input.language === previewInputs[0].language)
      ? previewInputs[0].language
      : null;
  const format = commonLanguage
    ? formatRegistry.getById(commonLanguage)
    : undefined;
  const strategy = format?.mergeStrategy;
  let unavailableReason = "Selected tabs have different formats.";
  if (commonLanguage && !strategy)
    unavailableReason = `Merge as ${format?.name ?? commonLanguage} is unavailable for this format.`;
  if (strategy) {
    try {
      const eligibility = strategy.canMerge(previewInputs);
      unavailableReason = eligibility.canMerge ? "" : eligibility.reason;
    } catch (error) {
      unavailableReason =
        error instanceof Error
          ? error.message
          : "The format could not validate these tabs.";
    }
  }
  const canUseFormat = !!strategy && !unavailableReason;

  useEffect(() => {
    setOptions({});
    setOptionsUI(null);
    setOptionsError(null);
    setOptionsLoading(!!strategy?.getOptionsUI);
    if (!strategy?.getOptionsUI) return;
    let current = true;
    strategy
      .getOptionsUI()
      .then((module) => {
        if (current) {
          setOptionsUI(() => module.default);
          setOptionsLoading(false);
        }
      })
      .catch(() => {
        if (current) {
          setOptionsError("Could not load format options.");
          setOptionsLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, [strategy]);

  const previewResult: MergeResult | null = useMemo(() => {
    if (previewInputs.length < 2) return null;
    if (mode === "text") return joinTabsAsText(previewInputs, separator);
    if (!strategy || unavailableReason)
      return {
        ok: false,
        error: {
          code: "unavailable",
          message: unavailableReason || "Structured merge is unavailable.",
        },
      };
    try {
      return strategy.merge(previewInputs, options);
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "merge_failed",
          message:
            error instanceof Error
              ? error.message
              : "Could not merge these tabs.",
        },
      };
    }
  }, [previewInputs, mode, separator, strategy, unavailableReason, options]);

  const changeSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selected) => selected !== id)
        : [...current, id],
    );
    setSourceChanged(false);
    setCreateError(null);
  };

  const move = (index: number, offset: number) => {
    setSelectedIds((current) => {
      const next = [...current];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
    setSourceChanged(false);
    setCreateError(null);
  };

  const handleCreate = async () => {
    if (
      creating ||
      !previewResult?.ok ||
      previewInputs.length < 2 ||
      !title.trim() ||
      !clickedTab ||
      !workspaceId ||
      activeWorkspaceId !== workspaceId
    )
      return;
    setCreateError(null);
    const currentTabs = useTabsStore.getState().tabs;
    const currentSources = selectedIds
      .map((id) => currentTabs.find((tab) => tab.id === id))
      .filter((tab): tab is Tab => !!tab && isMergeableTab(tab, workspaceId));
    const currentInputs = captureMergeInputs(currentSources);
    if (!sameInputs(previewInputs, currentInputs)) {
      setRevision((value) => value + 1);
      setSourceChanged(true);
      return;
    }
    let result: MergeResult;
    if (mode === "text") result = joinTabsAsText(currentInputs, separator);
    else {
      if (!strategy) return;
      try {
        const eligibility = strategy.canMerge(currentInputs);
        result = eligibility.canMerge
          ? strategy.merge(currentInputs, options)
          : {
              ok: false,
              error: { code: "unavailable", message: eligibility.reason },
            };
      } catch (error) {
        result = {
          ok: false,
          error: {
            code: "merge_failed",
            message:
              error instanceof Error
                ? error.message
                : "Could not merge these tabs.",
          },
        };
      }
    }
    if (!result.ok) {
      setCreateError(result.error.message);
      setRevision((value) => value + 1);
      return;
    }
    setCreating(true);
    try {
      const newId = await createTab(
        {
          title: title.trim(),
          content: result.content,
          language: result.language,
          languageLocked: true,
          contentKind: "text",
          workspaceId,
        },
        isRightSide,
      );
      if (!newId) throw new Error("Could not create the merged tab.");
      onClose();
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Could not create the merged tab.",
      );
    } finally {
      setCreating(false);
    }
  };

  if (!clickedTab || !workspaceId || getTabContentKind(clickedTab) !== "text")
    return null;

  return (
    <BaseModal
      title="Merge tabs"
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      maxHeightClass="max-h-[90vh]"
    >
      <div className="space-y-5 p-5 text-main sm:p-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(15rem,0.85fr)]">
          <section className="overflow-hidden rounded-lg border border-base bg-surface-secondary">
            <div className="flex items-start justify-between gap-3 border-b border-base px-4 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  1
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-main">
                    Choose source tabs
                  </h3>
                  <p className="mt-0.5 text-xs text-secondary">
                    Select two or more tabs from this workspace.
                  </p>
                </div>
              </div>
              <span className="flex-none rounded-full border border-base bg-element px-2 py-0.5 text-xs text-secondary">
                {selectedIds.length} selected
              </span>
            </div>
            <div className="custom-scrollbar max-h-52 space-y-1 overflow-y-auto p-2 pr-1">
              {eligibleTabs.map((tab) => {
                const selected = selectedIds.includes(tab.id);
                return (
                  <label
                    key={tab.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors ${
                      selected
                        ? "border-info/50 bg-info/10"
                        : "border-transparent hover:border-base hover:bg-element-hover"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => changeSelection(tab.id)}
                      aria-label={`Include ${tab.title}`}
                      className="h-4 w-4 flex-none accent-info"
                    />
                    <FileText size={15} className="flex-none text-muted" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-main">
                      {tab.title}
                    </span>
                    <span className="flex-none rounded bg-element px-2 py-0.5 font-mono text-[10px] text-muted">
                      {tab.language}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-base bg-surface-secondary">
            <div className="flex items-start gap-3 border-b border-base px-4 py-3">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                2
              </span>
              <div>
                <h3 className="text-sm font-semibold text-main">
                  Set merge order
                </h3>
                <p className="mt-0.5 text-xs text-secondary">
                  Content is combined from top to bottom.
                </p>
              </div>
            </div>
            <ol className="custom-scrollbar max-h-52 space-y-2 overflow-y-auto p-3">
              {orderedTabs.map((tab, index) => (
                <li
                  key={tab.id}
                  className="flex items-center gap-2 rounded-md border border-base bg-element px-2.5 py-2"
                >
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-secondary">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {tab.title}
                  </span>
                  <button
                    type="button"
                    aria-label={`Move ${tab.title} up`}
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="rounded p-1.5 text-secondary transition-colors hover:bg-element-hover hover:text-main focus:outline-none focus:ring-2 focus:border-focus disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${tab.title} down`}
                    title="Move down"
                    disabled={index === orderedTabs.length - 1}
                    onClick={() => move(index, 1)}
                    className="rounded p-1.5 text-secondary transition-colors hover:bg-element-hover hover:text-main focus:outline-none focus:ring-2 focus:border-focus disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className="overflow-hidden rounded-lg border border-base bg-surface-secondary">
          <div className="flex items-start gap-3 border-b border-base px-4 py-3">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              3
            </span>
            <div>
              <h3 className="text-sm font-semibold text-main">
                Configure the result
              </h3>
              <p className="mt-0.5 text-xs text-secondary">
                The merge creates a new tab and keeps every source tab.
              </p>
            </div>
          </div>
          <div className="space-y-4 p-4">
            <label className="block text-sm font-medium text-secondary">
              Result title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="input-themed mt-1.5 block w-full rounded-md px-3 py-2 text-sm"
              />
            </label>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-secondary">
                Merge mode
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    mode === "text"
                      ? "border-info/50 bg-info/10"
                      : "border-base bg-element hover:bg-element-hover"
                  }`}
                >
                  <input
                    type="radio"
                    name="merge-mode"
                    aria-label="Join as text (plain text)"
                    checked={mode === "text"}
                    onChange={() => {
                      setMode("text");
                      setSourceChanged(false);
                    }}
                    className="mt-0.5 accent-info"
                  />
                  <span>
                    <span className="block text-sm font-medium text-main">
                      Join as text
                    </span>
                    <span className="mt-0.5 block text-xs text-secondary">
                      Combine exact contents with a separator into plain text.
                    </span>
                  </span>
                </label>
                {strategy && (
                  <label
                    className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                      canUseFormat
                        ? "cursor-pointer"
                        : "cursor-not-allowed opacity-60"
                    } ${
                      mode === "format"
                        ? "border-info/50 bg-info/10"
                        : "border-base bg-element hover:bg-element-hover"
                    }`}
                  >
                    <input
                      type="radio"
                      name="merge-mode"
                      aria-label={`Merge as ${format?.name ?? commonLanguage}`}
                      checked={mode === "format"}
                      disabled={!canUseFormat}
                      onChange={() => {
                        setMode("format");
                        setSourceChanged(false);
                      }}
                      className="mt-0.5 accent-info"
                    />
                    <span>
                      <span className="block text-sm font-medium text-main">
                        Merge as {format?.name ?? commonLanguage}
                      </span>
                      <span className="mt-0.5 block text-xs text-secondary">
                        Preserve the format&apos;s structure and validation.
                      </span>
                    </span>
                  </label>
                )}
              </div>
              {!canUseFormat && previewInputs.length >= 2 && (
                <div className="mt-2 flex items-start gap-2 rounded-md bg-info-subtle px-3 py-2 text-xs">
                  <AlertCircle size={14} className="mt-0.5 flex-none" />
                  <p>{unavailableReason}</p>
                </div>
              )}
            </fieldset>

            {mode === "text" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-secondary">
                  Separator
                  <select
                    value={separatorPreset}
                    onChange={(event) => {
                      setSeparatorPreset(event.target.value);
                      setSourceChanged(false);
                    }}
                    className="input-themed mt-1.5 block w-full rounded-md px-3 py-2 text-sm"
                  >
                    <option value="\n">Newline</option>
                    <option value="\n\n">Blank line</option>
                    <option value="">None</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
                {separatorPreset === "custom" && (
                  <label className="block text-sm font-medium text-secondary">
                    Custom separator
                    <input
                      aria-label="Custom separator"
                      value={customSeparator}
                      onChange={(event) => {
                        setCustomSeparator(event.target.value);
                        setSourceChanged(false);
                      }}
                      className="input-themed mt-1.5 block w-full rounded-md px-3 py-2 text-sm"
                    />
                  </label>
                )}
              </div>
            )}
            {mode === "format" && OptionsUI && (
              <OptionsUI
                inputs={previewInputs}
                options={options}
                onOptionsChange={setOptions}
              />
            )}
            {mode === "format" && optionsLoading && (
              <div className="flex items-center gap-2 text-sm text-secondary">
                <Loader2 size={15} className="animate-spin" />
                Loading format options...
              </div>
            )}
            {mode === "format" && optionsError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md bg-danger-subtle px-3 py-2 text-sm"
              >
                <AlertCircle size={16} className="mt-0.5 flex-none" />
                {optionsError}
              </div>
            )}
          </div>
        </section>

        <section
          aria-label="Merge preview"
          className="overflow-hidden rounded-lg border border-base bg-surface-secondary"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base px-4 py-3">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-secondary" />
              <h3 className="text-sm font-semibold text-main">Preview</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
              <span className="rounded-full border border-base bg-element px-2 py-0.5">
                {previewInputs.length} source
                {previewInputs.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-full border border-base bg-element px-2 py-0.5 font-mono">
                Output language:{" "}
                {previewResult?.ok
                  ? previewResult.language
                  : mode === "text"
                    ? "plaintext"
                    : (commonLanguage ?? "unknown")}
              </span>
            </div>
          </div>
          <div className="p-4">
            {!previewResult && (
              <div className="flex min-h-24 flex-col items-center justify-center rounded-md border border-dashed border-base bg-element/40 px-4 py-6 text-center">
                <p className="text-sm font-medium text-main">
                  Select at least two tabs
                </p>
                <p className="mt-1 text-xs text-secondary">
                  Your merged output will appear here before it is created.
                </p>
              </div>
            )}
            {previewResult && !previewResult.ok && (
              <div
                role="alert"
                className="rounded-md border border-danger/20 bg-danger-subtle p-3 text-sm"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="mt-0.5 flex-none" />
                  <p className="font-medium">{previewResult.error.message}</p>
                </div>
                {previewResult.error.paths?.length ? (
                  <p className="mt-2 pl-6 text-xs">
                    Conflicts:{" "}
                    {previewResult.error.paths
                      .slice(0, DIAGNOSTIC_LIMIT)
                      .join(", ")}
                    {previewResult.error.paths.length > DIAGNOSTIC_LIMIT
                      ? ` and ${previewResult.error.paths.length - DIAGNOSTIC_LIMIT} more`
                      : ""}
                  </p>
                ) : null}
              </div>
            )}
            {previewResult?.ok && (
              <>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-secondary">
                  <span>{previewResult.content.length} characters</span>
                  {previewResult.counts && (
                    <span>
                      {Object.entries(previewResult.counts)
                        .slice(0, DIAGNOSTIC_LIMIT)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(" · ")}
                      {Object.keys(previewResult.counts).length >
                      DIAGNOSTIC_LIMIT
                        ? " · …"
                        : ""}
                    </span>
                  )}
                </div>
                {previewResult.warnings
                  .slice(0, DIAGNOSTIC_LIMIT)
                  .map((warning, index) => (
                    <div
                      key={index}
                      role="status"
                      className="mt-2 flex items-start gap-2 rounded-md bg-warning-subtle px-3 py-2 text-xs"
                    >
                      <AlertCircle size={14} className="mt-0.5 flex-none" />
                      <p>{warning}</p>
                    </div>
                  ))}
                {previewResult.warnings.length > DIAGNOSTIC_LIMIT && (
                  <p className="mt-2 text-xs text-secondary">
                    {previewResult.warnings.length - DIAGNOSTIC_LIMIT} more
                    warnings
                  </p>
                )}
                {previewResult.conflicts?.length ? (
                  <p className="mt-2 text-xs text-warning">
                    Conflicts:{" "}
                    {previewResult.conflicts
                      .slice(0, DIAGNOSTIC_LIMIT)
                      .join(", ")}
                    {previewResult.conflicts.length > DIAGNOSTIC_LIMIT
                      ? ` and ${previewResult.conflicts.length - DIAGNOSTIC_LIMIT} more`
                      : ""}
                  </p>
                ) : null}
                <pre className="custom-scrollbar mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md border border-base bg-canvas p-3 font-mono text-xs leading-relaxed text-main">
                  {previewResult.content.slice(0, PREVIEW_LIMIT)}
                  {previewResult.content.length > PREVIEW_LIMIT ? "…" : ""}
                </pre>
              </>
            )}
          </div>
        </section>
        {sourceChanged && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-subtle px-3 py-2 text-sm"
          >
            <AlertCircle size={16} className="mt-0.5 flex-none" />
            <p>
              Source content changed. Review the refreshed preview, then create
              again.
            </p>
          </div>
        )}
        {createError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-danger/20 bg-danger-subtle px-3 py-2 text-sm"
          >
            <AlertCircle size={16} className="mt-0.5 flex-none" />
            <p>{createError}</p>
          </div>
        )}
        <div className="flex justify-end gap-2 border-t border-base pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-base bg-element px-4 py-2 text-sm font-medium text-main transition-colors hover:bg-element-hover focus:outline-none focus:ring-2 focus:border-focus"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={
              creating ||
              !previewResult?.ok ||
              !title.trim() ||
              activeWorkspaceId !== workspaceId ||
              (mode === "format" && (optionsLoading || !!optionsError))
            }
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:border-focus disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? "Creating..." : "Create merged tab"}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
