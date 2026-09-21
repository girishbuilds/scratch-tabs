import React from "react";
import { FormatModule, StatusBarItem } from "../types";
import { HarFormatDetector } from "../har";
import { formatRegistry } from "../registry";
import { smartViewRegistry, SmartView } from "../../views/registry";
import { Network } from "lucide-react";
import { HarViewer } from "./views/components/HarViewer";
import { SmartViewButtons } from "../../components/StatusBar/SmartViewButtons";
import { StatusItemProps } from "../../components/StatusBar/types";
import { harMergeStrategy } from "./mergeStrategy";

export class HarFormatModule implements FormatModule {
  private detector: HarFormatDetector;
  readonly mergeStrategy = harMergeStrategy;

  constructor() {
    this.detector = new HarFormatDetector();
  }

  get id(): string { return this.detector.id; }
  get name(): string { return this.detector.name; }
  get extensions(): string[] { return this.detector.extensions; }
  get priority(): number { return this.detector.priority; }

  detect(content: string) { return this.detector.detect(content); }
  registerProvider(
    monaco: Parameters<FormatModule["registerProvider"]>[0],
  ): void {
    this.detector.registerProvider(monaco);
  }
  sampleContent(): string { return this.detector.sampleContent(); }
  getFileExtension(): string { return this.detector.getFileExtension(); }

  getSmartViews(): SmartView[] {
    return [
      {
        id: "har-viewer",
        languageId: "har",
        label: "HAR Viewer",
        icon: Network,
        component: HarViewer,
        mode: "replaces",
        priority: 1,
      },
    ];
  }

  getStatusBarItems(): StatusBarItem[] {
    return [
      {
        id: "har-smart-view-button",
        component: (props: StatusItemProps) =>
          React.createElement(SmartViewButtons, {
            language: this.id,
            tabId: props.activeTab?.id ?? "",
          }),
        priority: 10,
      },
    ];
  }
}

const harModule = new HarFormatModule();
formatRegistry.register(harModule);

harModule.getSmartViews().forEach((view) => {
  smartViewRegistry.register(view);
});

export const registerHarProvider = (
  monaco: Parameters<FormatModule["registerProvider"]>[0],
) => {
  harModule.registerProvider(monaco);
};
