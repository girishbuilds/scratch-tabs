import type {
  MergeEligibility,
  MergeInput,
  MergeResult,
  MergeStrategy,
  MergeValidationError,
} from "../types";
import type { HarFile, HarLog } from "./views/types";
import {
  mergeHarFiles,
  parseHarContent,
  serializeHar,
} from "./views/utils/harEntryOperations";

interface ParsedHarInput {
  input: Readonly<MergeInput>;
  file: HarFile;
}

interface PreparedHarMerge {
  ok: true;
  file: HarFile;
  warnings: string[];
  duplicatePageIds: number;
}

const invalid = (
  code: string,
  message: string,
  paths?: string[],
): MergeValidationError => ({
  ok: false,
  error: { code, message, ...(paths?.length ? { paths } : {}) },
});

const parseInputs = (
  inputs: ReadonlyArray<Readonly<MergeInput>>,
): ParsedHarInput[] | MergeValidationError => {
  if (inputs.length < 2) {
    return invalid("har_too_few_inputs", "Select at least two HAR tabs.");
  }

  const parsed: ParsedHarInput[] = [];
  for (const input of inputs) {
    if (input.language !== "har") {
      return invalid(
        "har_wrong_language",
        `${input.title} is not marked as HAR.`,
      );
    }

    const result = parseHarContent(input.content);
    if (!result.file) {
      return invalid(
        "har_parse_error",
        `Could not parse ${input.title}: ${result.error ?? "Invalid HAR."}`,
      );
    }

    const pages = result.file.log.pages;
    if (pages !== undefined && !Array.isArray(pages)) {
      return invalid(
        "har_invalid_pages",
        `${input.title} has an invalid log.pages value; expected an array.`,
      );
    }

    for (let index = 0; index < (pages?.length ?? 0); index += 1) {
      const page = pages![index] as unknown;
      if (
        page === null ||
        typeof page !== "object" ||
        typeof (page as { id?: unknown }).id !== "string" ||
        !(page as { id: string }).id
      ) {
        return invalid(
          "har_invalid_page_id",
          `${input.title} has a page without a valid ID.`,
          [`${input.title}.log.pages[${index}].id`],
        );
      }
    }

    for (let index = 0; index < result.file.log.entries.length; index += 1) {
      const entry = result.file.log.entries[index] as unknown;
      if (entry === null || typeof entry !== "object") {
        return invalid(
          "har_invalid_entry",
          `${input.title} has an invalid request entry.`,
          [`${input.title}.log.entries[${index}]`],
        );
      }
      const pageref = (entry as { pageref?: unknown }).pageref;
      if (pageref !== undefined && typeof pageref !== "string") {
        return invalid(
          "har_invalid_page_reference",
          `${input.title} has a request entry with a non-string pageref.`,
          [`${input.title}.log.entries[${index}].pageref`],
        );
      }
    }

    parsed.push({ input, file: result.file });
  }

  return parsed;
};

const logMetadata = (log: HarLog): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(log).filter(([key]) => key !== "pages" && key !== "entries"),
  );

const prepareMerge = (
  inputs: ReadonlyArray<Readonly<MergeInput>>,
): PreparedHarMerge | MergeValidationError => {
  const parsed = parseInputs(inputs);
  if (!Array.isArray(parsed)) return parsed;

  const warnings: string[] = [];
  const seenPages = new Map<string, string>();
  let duplicatePageIds = 0;
  const normalized = parsed.map(({ input, file }) => {
    const pages = file.log.pages?.filter((page) => {
      if (seenPages.has(page.id)) {
        const firstSource = seenPages.get(page.id) ?? "an earlier tab";
        duplicatePageIds += 1;
        warnings.push(
          `Duplicate page ID "${page.id}" in ${input.title}; kept the first definition from ${firstSource}.`,
        );
        return false;
      }
      seenPages.set(page.id, input.title);
      return true;
    });

    return {
      ...file,
      log: {
        ...file.log,
        pages,
      },
    };
  });

  const firstMetadata = JSON.stringify(logMetadata(normalized[0].log));
  for (let index = 1; index < normalized.length; index += 1) {
    if (JSON.stringify(logMetadata(normalized[index].log)) !== firstMetadata) {
      warnings.push(
        `HAR log metadata differs in ${parsed[index].input.title}; kept metadata from ${parsed[0].input.title}.`,
      );
    }
  }

  let file = normalized[0];
  for (const incoming of normalized.slice(1)) {
    file = mergeHarFiles(file, incoming);
  }

  const pageIds = new Set(file.log.pages?.map((page) => page.id) ?? []);
  const missingReferences: string[] = [];
  parsed.forEach(({ input, file: source }) => {
    source.log.entries.forEach((entry, index) => {
      if (entry.pageref !== undefined && !pageIds.has(entry.pageref)) {
        missingReferences.push(`${input.title}.log.entries[${index}].pageref`);
      }
    });
  });
  if (missingReferences.length > 0) {
    return invalid(
      "har_missing_page_references",
      `${missingReferences.length} request entr${missingReferences.length === 1 ? "y references" : "ies reference"} a page that is not present in the merged HAR.`,
      missingReferences,
    );
  }

  return { ok: true, file, warnings, duplicatePageIds };
};

export const harMergeStrategy: MergeStrategy = {
  canMerge(inputs): MergeEligibility {
    const prepared = prepareMerge(inputs);
    return prepared.ok
      ? { canMerge: true }
      : { canMerge: false, reason: prepared.error.message };
  },

  merge(inputs): MergeResult {
    const prepared = prepareMerge(inputs);
    if (!prepared.ok) return prepared;

    return {
      ok: true,
      content: serializeHar(prepared.file),
      language: "har",
      warnings: prepared.warnings,
      counts: {
        sources: inputs.length,
        entries: prepared.file.log.entries.length,
        pages: prepared.file.log.pages?.length ?? 0,
        duplicatePageIds: prepared.duplicatePageIds,
      },
    };
  },
};
