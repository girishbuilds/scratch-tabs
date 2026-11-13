/**
 * Pipeline Storage Service
 *
 * CRUD operations for saved pipelines in IndexedDB.
 * Pipelines are stored globally (not scoped to workspaces).
 */

import { db } from "../../db";
import { SavedPipeline, Pipeline, PipelineStep } from "./types";

/**
 * Generate a UUID (with fallback for older environments)
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get all saved pipelines, sorted by lastUsedAt (most recent first)
 */
export async function getAllPipelines(): Promise<SavedPipeline[]> {
  try {
    const pipelines = await db.pipelines
      .orderBy("lastUsedAt")
      .reverse()
      .toArray();
    return pipelines;
  } catch (error) {
    console.error("[PipelineStorage] Failed to get pipelines:", error);
    return [];
  }
}

/**
 * Get a pipeline by ID
 */
export async function getPipelineById(
  id: string,
): Promise<SavedPipeline | null> {
  try {
    const pipeline = await db.pipelines.get(id);
    return pipeline || null;
  } catch (error) {
    console.error("[PipelineStorage] Failed to get pipeline:", error);
    return null;
  }
}

/**
 * Save a new pipeline or update an existing one
 */
export async function savePipeline(pipeline: Pipeline): Promise<SavedPipeline> {
  const now = Date.now();

  const record: SavedPipeline = {
    id: pipeline.id || generateUUID(),
    name: pipeline.name,
    description: pipeline.description,
    steps: JSON.stringify(pipeline.steps),
    createdAt: now,
    lastModified: now,
    lastUsedAt: now,
    isFavorite: false,
  };

  // Check if it already exists
  const existing = await db.pipelines.get(record.id);
  if (existing) {
    record.createdAt = existing.createdAt;
    record.isFavorite = existing.isFavorite;
  }

  try {
    await db.pipelines.put(record);
    return record;
  } catch (error) {
    console.error("[PipelineStorage] Failed to save pipeline:", error);
    throw error;
  }
}

/**
 * Update pipeline name
 */
export async function renamePipeline(
  id: string,
  name: string,
): Promise<boolean> {
  try {
    await db.pipelines.update(id, {
      name,
      lastModified: Date.now(),
    });
    return true;
  } catch (error) {
    console.error("[PipelineStorage] Failed to rename pipeline:", error);
    return false;
  }
}

/**
 * Update pipeline's lastUsedAt timestamp
 */
export async function touchPipeline(id: string): Promise<void> {
  try {
    await db.pipelines.update(id, {
      lastUsedAt: Date.now(),
    });
  } catch (error) {
    console.error("[PipelineStorage] Failed to touch pipeline:", error);
  }
}

/**
 * Toggle pipeline favorite status
 */
export async function togglePipelineFavorite(id: string): Promise<boolean> {
  try {
    const pipeline = await db.pipelines.get(id);
    if (!pipeline) return false;

    const newFavorite = !pipeline.isFavorite;
    await db.pipelines.update(id, {
      isFavorite: newFavorite,
      lastModified: Date.now(),
    });
    return newFavorite;
  } catch (error) {
    console.error("[PipelineStorage] Failed to toggle favorite:", error);
    return false;
  }
}

/**
 * Delete a pipeline
 */
export async function deletePipeline(id: string): Promise<boolean> {
  try {
    await db.pipelines.delete(id);
    return true;
  } catch (error) {
    console.error("[PipelineStorage] Failed to delete pipeline:", error);
    return false;
  }
}

/**
 * Convert a SavedPipeline to a Pipeline (deserialize steps)
 */
export function toPipeline(saved: SavedPipeline): Pipeline {
  let steps: PipelineStep[] = [];
  try {
    steps = JSON.parse(saved.steps);
  } catch (error) {
    console.error("[PipelineStorage] Failed to parse steps:", error);
  }

  return {
    id: saved.id,
    name: saved.name,
    description: saved.description,
    steps,
  };
}

/**
 * Get favorite pipelines
 */
export async function getFavoritePipelines(): Promise<SavedPipeline[]> {
  try {
    // isFavorite is stored as a boolean, and booleans are not valid IndexedDB
    // keys, so rows never enter an index on it. Filter in memory instead.
    const pipelines = await db.pipelines.toArray();
    return pipelines.filter((p) => p.isFavorite);
  } catch (error) {
    console.error("[PipelineStorage] Failed to get favorites:", error);
    return [];
  }
}

/**
 * Get recently used pipelines (top N)
 */
export async function getRecentPipelines(
  limit: number = 5,
): Promise<SavedPipeline[]> {
  try {
    const pipelines = await db.pipelines
      .orderBy("lastUsedAt")
      .reverse()
      .limit(limit)
      .toArray();
    return pipelines;
  } catch (error) {
    console.error("[PipelineStorage] Failed to get recent pipelines:", error);
    return [];
  }
}

/**
 * Duplicate a pipeline with a new name
 */
export async function duplicatePipeline(
  id: string,
  newName?: string,
): Promise<SavedPipeline | null> {
  try {
    const original = await db.pipelines.get(id);
    if (!original) return null;

    const now = Date.now();
    const duplicate: SavedPipeline = {
      ...original,
      id: generateUUID(),
      name: newName || `${original.name || "Pipeline"} (Copy)`,
      createdAt: now,
      lastModified: now,
      lastUsedAt: now,
      isFavorite: false,
    };

    await db.pipelines.add(duplicate);
    return duplicate;
  } catch (error) {
    console.error("[PipelineStorage] Failed to duplicate pipeline:", error);
    return null;
  }
}
