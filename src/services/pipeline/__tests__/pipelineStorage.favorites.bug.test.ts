/**
 * KNOWN-FAILING test (see BUGS.md). Real Dexie on fake-indexeddb.
 *
 * isFavorite is stored as a boolean. Booleans are not valid IndexedDB keys, so rows are never
 * entered into the isFavorite index and `.where("isFavorite").equals(1)` can never match.
 * (getFavoritePipelines currently has no callers, so this is latent.)
 */
import "../../../db/testing/structuredClonePolyfill";
import "fake-indexeddb/auto";

jest.mock("dexie", () => jest.requireActual("../../../../node_modules/dexie/dist/dexie.js"));

import { db } from "../../../db";
import { getFavoritePipelines } from "../pipelineStorage";

describe("BUG: getFavoritePipelines never returns anything", () => {
  it("returns pipelines marked as favorite", async () => {
    await db.pipelines.bulkPut([
      { id: "p1", name: "fav", steps: "[]", createdAt: 1, lastModified: 1, lastUsedAt: 1, isFavorite: true },
      { id: "p2", name: "plain", steps: "[]", createdAt: 1, lastModified: 1, lastUsedAt: 1, isFavorite: false },
    ]);

    const favorites = await getFavoritePipelines();

    expect(favorites.map((p) => p.id)).toEqual(["p1"]);
  });
});
