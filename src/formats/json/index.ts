import React from "react";
import { FormatModule, StatusBarItem } from "../types";
import { JsonFormatDetector } from "../json";
import { formatRegistry } from "../registry";
import { smartViewRegistry } from "../../views/registry";
import { JsonSmartView } from "./views/JsonSmartView";
import { MoreHorizontal } from "../../components/Icons";
import { JsonStatusItem } from "./StatusItem";
import { SmartViewButtons } from "../../components/StatusBar/SmartViewButtons";
import { StatusItemProps } from "../../components/StatusBar/types";
import { jsonShareStrategy } from "./shareStrategy";
import { jsonMergeStrategy } from "./mergeStrategy";

// Create the JSON format module that implements the new interface
// while preserving the legacy methods for backward compatibility
export class JsonFormatModule implements FormatModule {
  private detector: JsonFormatDetector;
  shareStrategy = jsonShareStrategy;
  mergeStrategy = jsonMergeStrategy;

  constructor() {
    this.detector = new JsonFormatDetector();
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
  getSmartViews() {
    return [
      {
        id: "json-workbench",
        languageId: "json",
        label: "JSON Workbench",
        icon: MoreHorizontal,
        component: JsonSmartView,
        mode: "replaces" as const,
        priority: 1,
      },
    ];
  }

  // New method for status bar items
  getStatusBarItems(): StatusBarItem[] {
    return [
      {
        id: 'json-validity',
        component: JsonStatusItem,
        priority: 10,
      },
      {
        id: 'json-smart-view-button',
        component: (props: StatusItemProps) =>
          React.createElement(SmartViewButtons, {
            language: this.id,
            tabId: props.activeTab?.id || ''
          }),
        priority: 20,
      },
    ];
  }
}

// Create and register the module
const jsonModule = new JsonFormatModule();
formatRegistry.register(jsonModule);

// Register the smart view
jsonModule.getSmartViews()?.forEach(view => {
  smartViewRegistry.register(view);
});

// Export for backward compatibility
export const registerJsonProvider = (
  monaco: Parameters<FormatModule["registerProvider"]>[0],
) => {
  jsonModule.registerProvider(monaco);
};

// Register pipeline operations (self-registration on import)
import "./pipelineOperations";
