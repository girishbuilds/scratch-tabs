import type { MergeInput } from "../../types";
import { harMergeStrategy } from "../mergeStrategy";
import type { HarEntry, HarFile, HarPage } from "../views/types";

const makePage = (id: string, title = id): HarPage => ({
  id,
  title,
  startedDateTime: "2026-01-01T00:00:00.000Z",
  pageTimings: {},
});

const makeEntry = (url: string, pageref?: string): HarEntry => ({
  ...(pageref === undefined ? {} : { pageref }),
  startedDateTime: "2026-01-01T00:00:00.000Z",
  time: 10,
  request: {
    method: "GET",
    url,
    httpVersion: "HTTP/1.1",
    headers: [],
    queryString: [],
    cookies: [],
    headersSize: 0,
    bodySize: 0,
  },
  response: {
    status: 200,
    statusText: "OK",
    httpVersion: "HTTP/1.1",
    headers: [],
    cookies: [],
    content: { size: 0, mimeType: "text/plain" },
    redirectURL: "",
    headersSize: 0,
    bodySize: 0,
  },
  timings: { send: 1, wait: 8, receive: 1 },
});

const makeHar = (
  entries: HarEntry[],
  pages?: HarPage[],
  metadata: Partial<HarFile["log"]> = {},
): HarFile => ({
  log: {
    version: "1.2",
    creator: { name: "Scratch Tabs", version: "1" },
    ...metadata,
    ...(pages === undefined ? {} : { pages }),
    entries,
  },
});

const input = (id: string, title: string, file: HarFile): MergeInput => ({
  id,
  title,
  language: "har",
  content: JSON.stringify(file),
});

const parseSuccess = (result: ReturnType<typeof harMergeStrategy.merge>) => {
  expect(result).toEqual(expect.objectContaining({ ok: true, language: "har" }));
  if (!result.ok) throw new Error(result.error.message);
  return { result, file: JSON.parse(result.content) as HarFile };
};

describe("HAR merge strategy", () => {
  it("combines pages and entries from multiple tabs in selected order", () => {
    const merged = parseSuccess(
      harMergeStrategy.merge(
        [
          input(
            "one",
            "First",
            makeHar([makeEntry("https://example.com/one", "page-1")], [
              makePage("page-1"),
            ]),
          ),
          input(
            "two",
            "Second",
            makeHar([makeEntry("https://example.com/two", "page-2")], [
              makePage("page-2"),
            ]),
          ),
        ],
        {},
      ),
    );

    expect(merged.file.log.pages?.map((page) => page.id)).toEqual([
      "page-1",
      "page-2",
    ]);
    expect(merged.file.log.entries.map((entry) => entry.request.url)).toEqual([
      "https://example.com/one",
      "https://example.com/two",
    ]);
    expect(merged.result.counts).toEqual({
      sources: 2,
      entries: 2,
      pages: 2,
      duplicatePageIds: 0,
    });
  });

  it("rejects invalid HAR content and identifies the source", () => {
    const inputs: MergeInput[] = [
      input("one", "First", makeHar([])),
      { id: "bad", title: "Broken", language: "har", content: "{oops" },
    ];

    expect(harMergeStrategy.canMerge(inputs)).toEqual({
      canMerge: false,
      reason: expect.stringContaining("Broken"),
    });
    expect(harMergeStrategy.merge(inputs, {})).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "har_parse_error" }),
    });
  });

  it("warns about duplicate page IDs, keeps the first page, and preserves requests", () => {
    const { result, file } = parseSuccess(
      harMergeStrategy.merge(
        [
          input(
            "one",
            "First",
            makeHar(
              [makeEntry("https://example.com/same", "shared")],
              [makePage("shared", "First page")],
            ),
          ),
          input(
            "two",
            "Second",
            makeHar(
              [
                makeEntry("https://example.com/same", "shared"),
                makeEntry("https://example.com/extra", "shared"),
              ],
              [makePage("shared", "Second page")],
            ),
          ),
        ],
        {},
      ),
    );

    expect(file.log.pages).toEqual([makePage("shared", "First page")]);
    expect(file.log.entries).toHaveLength(3);
    expect(file.log.entries.filter((entry) => entry.request.url.endsWith("same"))).toHaveLength(2);
    expect(result.warnings).toEqual([
      expect.stringMatching(/duplicate page ID "shared".*kept.*First/i),
    ]);
    expect(result.counts?.duplicatePageIds).toBe(1);
  });

  it("rejects dangling page references with their entry paths", () => {
    const result = harMergeStrategy.merge(
      [
        input(
          "one",
          "First",
          makeHar([makeEntry("https://example.com/one", "known")], [
            makePage("known"),
          ]),
        ),
        input(
          "two",
          "Second",
          makeHar([makeEntry("https://example.com/two", "missing")]),
        ),
      ],
      {},
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: "har_missing_page_references",
        message: expect.stringContaining("1 request entry"),
        paths: ["Second.log.entries[0].pageref"],
      },
    });
  });

  it("keeps the first tab's log metadata and warns when later metadata differs", () => {
    const { result, file } = parseSuccess(
      harMergeStrategy.merge(
        [
          input(
            "one",
            "First",
            makeHar([], undefined, {
              creator: { name: "First creator", version: "1" },
              browser: { name: "First browser", version: "10" },
              comment: "first comment",
            }),
          ),
          input(
            "two",
            "Second",
            makeHar([], undefined, {
              version: "1.1",
              creator: { name: "Second creator", version: "2" },
              comment: "second comment",
            }),
          ),
        ],
        {},
      ),
    );

    expect(file.log).toEqual(
      expect.objectContaining({
        version: "1.2",
        creator: { name: "First creator", version: "1" },
        browser: { name: "First browser", version: "10" },
        comment: "first comment",
      }),
    );
    expect(result.warnings).toContain(
      "HAR log metadata differs in Second; kept metadata from First.",
    );
  });
});
