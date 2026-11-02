import { db } from "../../../db";
import { createKeyProvider } from "./scratchCrypto";
import {
  DexieScratchKeyStore,
  DexieScratchRepository,
  type ScratchDb,
} from "./scratchPersistence";

/** Production wiring: the shared Dexie database. */
const scratchDb = db as unknown as ScratchDb;

export const defaultScratchRepository = new DexieScratchRepository(scratchDb);
export const defaultKeyProvider = createKeyProvider(
  new DexieScratchKeyStore(scratchDb),
);
