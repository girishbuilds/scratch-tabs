import { fireEvent, render, screen } from "@testing-library/react";
import type { MergeInput, MergeOptions } from "../../types";
import JsonMergeOptions from "../JsonMergeOptions";
import { jsonMergeStrategy } from "../mergeStrategy";

const input = (id: string, title: string, content: string): MergeInput => ({
  id,
  title,
  content,
  language: "json",
});

const merge = (inputs: MergeInput[], options: MergeOptions = {}) =>
  jsonMergeStrategy.merge(inputs, options);

describe("JSON merge strategy", () => {
  it("concatenates array roots in selected order", () => {
    const result = merge([
      input("one", "One", '[{"id":1},2]'),
      input("two", "Two", '[3,{"id":4}]'),
    ]);

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        language: "json",
        conflicts: [],
        counts: { sources: 2, items: 4 },
      }),
    );
    if (result.ok) {
      expect(JSON.parse(result.content)).toEqual([{ id: 1 }, 2, 3, { id: 4 }]);
    }
  });

  it("deep merges nested objects without treating new leaves as conflicts", () => {
    const result = merge([
      input("one", "One", '{"user":{"name":"Ada"},"enabled":true}'),
      input("two", "Two", '{"user":{"role":"admin"},"count":2}'),
    ]);

    expect(result).toEqual(
      expect.objectContaining({ ok: true, conflicts: [] }),
    );
    if (result.ok) {
      expect(JSON.parse(result.content)).toEqual({
        user: { name: "Ada", role: "admin" },
        enabled: true,
        count: 2,
      });
    }
  });

  it("stops on conflicts by default and reports every conflict path", () => {
    const result = merge([
      input(
        "one",
        "One",
        '{"user":{"name":"Ada","roles":["admin"]},"enabled":true}',
      ),
      input(
        "two",
        "Two",
        '{"user":{"name":"Grace","roles":["author"]},"enabled":false}',
      ),
    ]);

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: "json_conflicts",
        paths: ["$.user.name", "$.user.roles", "$.enabled"],
      }),
    });
  });

  it("uses later values while retaining visible conflicts", () => {
    const result = merge(
      [
        input("one", "One", '{"user":{"name":"Ada","active":true}}'),
        input("two", "Two", '{"user":{"name":"Grace","age":44}}'),
      ],
      { conflictPolicy: "later" },
    );

    expect(result).toEqual(
      expect.objectContaining({ ok: true, conflicts: ["$.user.name"] }),
    );
    if (result.ok) {
      expect(JSON.parse(result.content)).toEqual({
        user: { name: "Grace", active: true, age: 44 },
      });
    }
  });

  it("uses earlier values while adding nonconflicting later keys", () => {
    const result = merge(
      [
        input("one", "One", '{"user":{"name":"Ada","active":true}}'),
        input("two", "Two", '{"user":{"name":"Grace","age":44}}'),
      ],
      { conflictPolicy: "earlier" },
    );

    expect(result).toEqual(
      expect.objectContaining({ ok: true, conflicts: ["$.user.name"] }),
    );
    if (result.ok) {
      expect(JSON.parse(result.content)).toEqual({
        user: { name: "Ada", active: true, age: 44 },
      });
    }
  });

  it("does not report equal leaves as conflicts", () => {
    const result = merge([
      input("one", "One", '{"same":{"value":1}}'),
      input("two", "Two", '{"same":{"value":1}}'),
    ]);

    expect(result).toEqual(
      expect.objectContaining({ ok: true, conflicts: [] }),
    );
  });

  it("omits unsafe keys recursively without polluting prototypes", () => {
    const prototype = Object.prototype as Record<string, unknown>;
    delete prototype.polluted;
    const result = merge(
      [
        input(
          "one",
          "One",
          '{"safe":{"value":1,"__proto__":{"polluted":"yes"}}}',
        ),
        input(
          "two",
          "Two",
          '{"safe":{"extra":2},"constructor":{"polluted":"yes"},"prototype":{"polluted":"yes"}}',
        ),
      ],
      { conflictPolicy: "later" },
    );

    expect(prototype.polluted).toBeUndefined();
    expect(result).toEqual(expect.objectContaining({ ok: true }));
    if (result.ok) {
      expect(JSON.parse(result.content)).toEqual({
        safe: { value: 1, extra: 2 },
      });
    }
  });

  it("rejects invalid JSON with the source title", () => {
    const inputs = [
      input("one", "One", '{"valid":true}'),
      input("two", "Broken", '{"invalid"'),
    ];

    expect(jsonMergeStrategy.canMerge(inputs)).toEqual({
      canMerge: false,
      reason: expect.stringContaining("Broken"),
    });
    expect(merge(inputs)).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "json_parse_error" }),
    });
  });

  it("rejects scalar roots", () => {
    const inputs = [input("one", "One", "42"), input("two", "Two", "7")];

    expect(jsonMergeStrategy.canMerge(inputs)).toEqual({
      canMerge: false,
      reason: expect.stringContaining("scalar root"),
    });
    expect(merge(inputs)).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "json_scalar_root" }),
    });
  });

  it("rejects mixed array and object roots", () => {
    const inputs = [input("one", "One", "[]"), input("two", "Two", "{}")];

    expect(jsonMergeStrategy.canMerge(inputs)).toEqual({
      canMerge: false,
      reason: expect.stringMatching(/root shapes differ.*array.*object/i),
    });
    expect(merge(inputs)).toEqual({
      ok: false,
      error: expect.objectContaining({ code: "json_mixed_roots" }),
    });
  });
});

describe("JSON merge options", () => {
  it("defaults to stop and reports conflict policy changes", () => {
    const onOptionsChange = jest.fn();
    render(
      <JsonMergeOptions
        inputs={[input("one", "One", "{}"), input("two", "Two", "{}")]}
        options={{}}
        onOptionsChange={onOptionsChange}
      />,
    );

    expect(screen.getByLabelText("Stop on conflict")).toBeChecked();
    fireEvent.click(screen.getByLabelText("Later tab wins"));
    expect(onOptionsChange).toHaveBeenCalledWith({ conflictPolicy: "later" });
    fireEvent.click(screen.getByLabelText("Earlier tab wins"));
    expect(onOptionsChange).toHaveBeenCalledWith({ conflictPolicy: "earlier" });
  });

  it("explains array concatenation instead of showing conflict controls", () => {
    render(
      <JsonMergeOptions
        inputs={[input("one", "One", "[]"), input("two", "Two", "[]")]}
        options={{}}
        onOptionsChange={jest.fn()}
      />,
    );

    expect(
      screen.getByText("Arrays are concatenated in the selected tab order."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Stop on conflict")).not.toBeInTheDocument();
  });
});
