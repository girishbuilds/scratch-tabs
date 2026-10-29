import { useCallback, useMemo } from "react";
import { useTabsStore } from "../../../../stores/tabsStore";
import { modelManager } from "../../../../services/modelManager";
import { ColumnSource } from "../utils/columnOperations";
import { parseColumnSource } from "../utils/parseColumnSource";

export interface SourceTabOption {
  id: string;
  title: string;
}

const CSV_LANGUAGE_ID = "csv";

/** Other open CSV tabs that can supply columns, and a way to read one as a table. */
export const useColumnSourceTabs = (currentTabId: string) => {
  const allTabs = useTabsStore((state) => state.tabs);

  const tabs = useMemo<SourceTabOption[]>(
    () =>
      allTabs
        .filter(
          (tab) =>
            tab.id !== currentTabId &&
            tab.language === CSV_LANGUAGE_ID &&
            !tab.isTablet &&
            !tab.isRich,
        )
        .map(({ id, title }) => ({ id, title })),
    [allTabs, currentTabId],
  );

  const loadSource = useCallback(
    (tabId: string): ColumnSource => {
      const stored = allTabs.find((tab) => tab.id === tabId)?.content;
      return parseColumnSource(modelManager.getContent(tabId) ?? stored ?? "");
    },
    [allTabs],
  );

  return { tabs, loadSource };
};
