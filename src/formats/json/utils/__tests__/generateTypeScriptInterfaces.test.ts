import {
  generateTypeScriptInterfaces,
  buildTypeScriptTabs,
} from "../generateTypeScriptInterfaces";

const byName = (json: unknown, root?: string) =>
  Object.fromEntries(
    generateTypeScriptInterfaces(json, root).map((i) => [i.interfaceName, i.code]),
  );

describe("generateTypeScriptInterfaces", () => {
  it("types fields that are null in any record as T | null", () => {
    const out = byName({
      users: [
        { id: 1, nickname: null },
        { id: 2, nickname: "bob" },
      ],
    });
    expect(out.User).toContain("nickname: string | null;");
    expect(out.User).toContain("id: number;");
  });

  it("finds the type even when the first record has the null", () => {
    const out = byName([{ a: null }, { a: 5 }]);
    expect(out.Root).toContain("a: number | null;");
  });

  it("keeps a field that is always null as any", () => {
    const out = byName({ a: null });
    expect(out.Root).toContain("a: any;");
  });

  it("marks keys missing from some records as optional", () => {
    const out = byName([{ a: 1, b: "x" }, { a: 2 }]);
    expect(out.Root).toContain("a: number;");
    expect(out.Root).toContain("b?: string;");
  });

  it("unions differing primitive types", () => {
    const out = byName([{ v: 1 }, { v: "x" }]);
    expect(out.Root).toContain("v: number | string;");
  });

  it("names array item interfaces in the singular", () => {
    const out = byName({
      users: [{ name: "a" }],
      categories: [{ title: "t" }],
      addresses: [{ street: "s" }],
      data: [{ x: 1 }],
    });
    expect(out.Root).toContain("users: User[];");
    expect(out.Root).toContain("categories: Category[];");
    expect(out.Root).toContain("addresses: Address[];");
    expect(out.Root).toContain("data: DataItem[];");
    expect(out.User).toBeDefined();
    expect(out.Users).toBeUndefined();
    expect(out.Category).toBeDefined();
    expect(out.Address).toBeDefined();
    expect(out.DataItem).toBeDefined();
  });

  it("keeps plain nested objects named after their key", () => {
    const out = byName({ profile: { age: 1 } });
    expect(out.Root).toContain("profile: Profile;");
    expect(out.Profile).toContain("age: number;");
  });

  it("merges nested objects across array records", () => {
    const out = byName([
      { address: { city: "A", zip: null } },
      { address: { city: "B", zip: "123" } },
    ]);
    expect(out.Address).toContain("zip: string | null;");
  });

  it("merges same-named objects from different parents instead of dropping them", () => {
    const result = generateTypeScriptInterfaces({
      billing: { address: { street: "a", zip: "1" } },
      shipping: { address: { street: "b", country: "US" } },
    });
    const address = result.filter((i) => i.interfaceName === "Address");
    expect(address).toHaveLength(1);
    expect(address[0].code).toContain("street: string;");
    expect(address[0].code).toContain("zip?: string;");
    expect(address[0].code).toContain("country?: string;");
  });

  it("merges a nested key that collides with the root name", () => {
    const result = generateTypeScriptInterfaces({ id: 1, root: { name: "x" } });
    const roots = result.filter((i) => i.interfaceName === "Root");
    expect(roots).toHaveLength(1);
    expect(roots[0].code).toContain("name?: string;");
    expect(roots[0].code).toContain("id?: number;");
  });

  it("handles arrays of primitives and empty arrays", () => {
    const out = byName({ tags: ["a", "b"], none: [] });
    expect(out.Root).toContain("tags: string[];");
    expect(out.Root).toContain("none: any[];");
  });

  it("generates a list alias for a root array", () => {
    const out = byName([{ id: 1 }], "User");
    expect(out.User).toContain("id: number;");
    expect(out.UserList).toBe("export type UserList = User[];");
  });
});

describe("buildTypeScriptTabs", () => {
  beforeAll(() => {
    let n = 0;
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { randomUUID: () => `id-${++n}` },
    });
  });

  it("puts every interface in a leading All tab", () => {
    const interfaces = generateTypeScriptInterfaces({ users: [{ name: "a" }] });
    const tabs = buildTypeScriptTabs(interfaces);

    expect(tabs.map((t) => t.title)).toEqual(["All", "Root", "User"]);
    expect(tabs[0].content).toBe(interfaces.map((i) => i.code).join("\n\n"));
    expect(tabs.every((t) => t.language === "typescript")).toBe(true);
  });

  it("does not add an All tab for a single interface", () => {
    const tabs = buildTypeScriptTabs(generateTypeScriptInterfaces({ a: 1 }));
    expect(tabs.map((t) => t.title)).toEqual(["Root"]);
  });
});
