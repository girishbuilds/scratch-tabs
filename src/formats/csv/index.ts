import React from "react";
import { FormatModule, StatusBarItem } from "../types";
import { CsvFormatDetector } from "../csv";
import { formatRegistry } from "../registry";
import { smartViewRegistry, SmartView } from "../../views/registry";
import { Table } from "../../components/Icons";
import { CsvTableViewer } from "./views/components/CsvTableViewer";
import { SmartViewButtons } from "../../components/StatusBar/SmartViewButtons";
import { StatusItemProps } from "../../components/StatusBar/types";
import { csvMergeStrategy } from "./mergeStrategy";

// Create the CSV format module that implements the new interface
export class CsvFormatModule implements FormatModule {
  private detector: CsvFormatDetector;
  readonly mergeStrategy = csvMergeStrategy;

  constructor() {
    this.detector = new CsvFormatDetector();
  }

  get id(): string {
    return this.detector.id;
  }

  get name(): string {
    return this.detector.name;
  }

  get extensions(): string[] {
    return this.detector.extensions;
  }

  get priority(): number {
    return this.detector.priority;
  }

  detect(content: string) {
    return this.detector.detect(content);
  }

  registerProvider(
    monaco: Parameters<FormatModule["registerProvider"]>[0],
  ): void {
    this.detector.registerProvider(monaco);
  }

  sampleContent(): string {
    return this.detector.sampleContent();
  }

  getFileExtension(): string {
    return this.detector.getFileExtension();
  }

  // New generic mechanism for smart views
  getSmartViews(): SmartView[] {
    return [
      {
        id: "csv-table",
        languageId: "csv",
        label: "Table View",
        icon: Table,
        component: CsvTableViewer,
        mode: "replaces",
        priority: 1,
      },
    ];
  }

  // New method for status bar items
  getStatusBarItems(): StatusBarItem[] {
    return [
      {
        id: 'csv-smart-view-button',
        component: (props: StatusItemProps) => 
          React.createElement(SmartViewButtons, {
            language: this.id,
            tabId: props.activeTab?.id || ''
          }),
        priority: 10,
      },
    ];
  }
}

// Create and register the module
const csvModule = new CsvFormatModule();
formatRegistry.register(csvModule);

// Register the smart view
csvModule.getSmartViews()?.forEach(view => {
  smartViewRegistry.register(view);
});

// Export for backward compatibility
export const registerCsvProvider = (
  monaco: Parameters<FormatModule["registerProvider"]>[0],
) => {
  csvModule.registerProvider(monaco);
};
