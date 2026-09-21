import type { MergeInput, MergeSuccess } from "../formats/types";
import type { Tab } from "../types";
import { modelManager } from "./modelManager";

type MergeSourceTab = Pick<Tab, "id" | "title" | "content" | "language">;

/** Capture content at preview/apply time, preserving the supplied tab order. */
export function captureMergeInputs(
  tabs: readonly MergeSourceTab[],
): MergeInput[] {
  return tabs.map((tab) => ({
    id: tab.id,
    title: tab.title,
    content: modelManager.getContent(tab.id) ?? tab.content ?? "",
    language: tab.language,
  }));
}

/** Join whole tab contents with exactly the supplied separator. */
export function joinTabsAsText(
  inputs: ReadonlyArray<Readonly<MergeInput>>,
  separator = "\n",
): MergeSuccess {
  return {
    ok: true,
    content: inputs.map((input) => input.content).join(separator),
    language: "plaintext",
    warnings: [],
  };
}
