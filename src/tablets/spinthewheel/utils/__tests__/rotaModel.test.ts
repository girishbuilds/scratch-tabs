import { generateRota, rotaToTable } from "../rotaModel";
import { DEFAULT_ROTA_CONFIG } from "../../contentModel";
import type { RotaConfig } from "../../types";

const config = (patch: Partial<RotaConfig> = {}): RotaConfig => ({
  ...DEFAULT_ROTA_CONFIG,
  startDate: "2026-08-03", // a Monday
  periods: 4,
  seed: 1,
  ...patch,
});

describe("generateRota", () => {
  it("returns no slots without names", () => {
    expect(generateRota(["  ", ""], config())).toEqual([]);
  });

  it("cycles through names in order for weekly frequency", () => {
    const slots = generateRota(["Alice", "Bob"], config());
    expect(slots).toEqual([
      { date: "2026-08-03", name: "Alice" },
      { date: "2026-08-10", name: "Bob" },
      { date: "2026-08-17", name: "Alice" },
      { date: "2026-08-24", name: "Bob" },
    ]);
  });

  it("advances one day at a time for daily frequency", () => {
    const slots = generateRota(["Alice", "Bob"], config({ frequency: "daily" }));
    expect(slots.map((slot) => slot.date)).toEqual([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
    ]);
    expect(slots.map((slot) => slot.name)).toEqual(["Alice", "Bob", "Alice", "Bob"]);
  });

  it("rolls weekend changes forward to Monday when skipping weekends", () => {
    // Friday start: daily steps land on Sat/Sun and must move to Mon.
    const slots = generateRota(
      ["Alice", "Bob", "Charlie"],
      config({ frequency: "daily", skipWeekends: true, startDate: "2026-08-07" }),
    );
    expect(slots.map((slot) => slot.date)).toEqual([
      "2026-08-07",
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
    ]);
  });

  it("keeps weekend dates when not skipping weekends", () => {
    const slots = generateRota(
      ["Alice"],
      config({ frequency: "daily", skipWeekends: false, startDate: "2026-08-07" }),
    );
    expect(slots.map((slot) => slot.date)).toEqual([
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
      "2026-08-10",
    ]);
  });

  it("uses every name once per pass when shuffling", () => {
    const names = ["Alice", "Bob", "Charlie", "Diana"];
    const slots = generateRota(names, config({ order: "shuffle", periods: 8 }));
    expect(slots.slice(0, 4).map((slot) => slot.name).sort()).toEqual(names);
    expect(slots.slice(4).map((slot) => slot.name).sort()).toEqual(names);
  });

  it("produces stable shuffle output until the config or names change", () => {
    const first = generateRota(["Alice", "Bob", "Charlie"], config({ order: "shuffle" }));
    const second = generateRota(["Alice", "Bob", "Charlie"], config({ order: "shuffle" }));
    expect(first).toEqual(second);
    const reshuffled = generateRota(
      ["Alice", "Bob", "Charlie"],
      config({ order: "shuffle", seed: 2 }),
    );
    expect(reshuffled).not.toEqual(first);
  });

  it("falls back to today for invalid start dates", () => {
    const slots = generateRota(["Alice"], config({ startDate: "not-a-date", frequency: "daily" }));
    const today = new Date();
    const iso = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-${`${today.getDate()}`.padStart(2, "0")}`;
    expect(slots[0]?.date).toBe(iso);
  });
});

describe("rotaToTable", () => {
  const slots = [
    { date: "2026-08-03", name: "Alice" },
    { date: "2026-08-10", name: "Bob" },
  ];

  it("emits a header row and one tab-separated row per slot", () => {
    expect(rotaToTable(slots)).toBe("Date\tName\n2026-08-03\tAlice\n2026-08-10\tBob");
  });

  it("keeps every slot so no names are dropped on copy", () => {
    const rows = rotaToTable(slots).split("\n");
    expect(rows).toHaveLength(slots.length + 1);
    expect(rows.slice(1).map((row) => row.split("\t")[1])).toEqual(["Alice", "Bob"]);
  });

  it("returns just the header when there are no slots", () => {
    expect(rotaToTable([])).toBe("Date\tName");
  });

  it("collapses tabs and newlines inside cells so columns stay aligned", () => {
    expect(rotaToTable([{ date: "2026-08-03", name: "Ann\tMarie\nJones" }])).toBe(
      "Date\tName\n2026-08-03\tAnn Marie Jones",
    );
  });
});
