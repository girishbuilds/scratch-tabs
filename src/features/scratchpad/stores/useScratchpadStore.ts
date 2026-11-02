import {
  defaultKeyProvider,
  defaultScratchRepository,
} from "../services/defaultScratchServices";
import { createScratchpadStore } from "./scratchpadStore";

/** App-wide Global Scratchpad store wired to the real database. */
export const useScratchpadStore = createScratchpadStore({
  repository: defaultScratchRepository,
  getKey: defaultKeyProvider.getKey,
});
