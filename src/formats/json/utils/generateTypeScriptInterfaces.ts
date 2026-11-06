// Define the structure for the output
export interface TypeScriptInterface {
  interfaceName: string;
  code: string;
}

type PlainObject = Record<string, unknown>;

const isPlainObject = (value: unknown): value is PlainObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);

// Helper function for PascalCase (needed for interface names)
function toPascalCase(str: string): string {
  // Handle empty or non-string input gracefully
  if (!str || typeof str !== "string") return "InvalidName";

  return str
    .split(/[^a-zA-Z0-9]+/) // Split by any non-alphanumeric sequence
    .filter((word) => word.length > 0) // Remove empty strings resulting from multiple separators
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/**
 * Naive English singularisation for naming the interface of array items
 * ("users" -> "User", "categories" -> "Category", "addresses" -> "Address").
 * Words that do not change (e.g. "data") get an "Item" suffix so they never
 * collide with the parent interface.
 */
function singularize(word: string): string {
  let singular = word;
  if (/ies$/i.test(word) && word.length > 3) {
    singular = word.replace(/ies$/i, "y");
  } else if (/(ss|x|ch|sh|us|zz)es$/i.test(word)) {
    singular = word.replace(/es$/i, "");
  } else if (/s$/i.test(word) && !/(ss|us|is)$/i.test(word)) {
    singular = word.replace(/s$/i, "");
  }
  return singular === word ? `${word}Item` : singular;
}

interface PropertyInfo {
  name: string;
  type: string;
  optional: boolean;
  /** Objects to describe with a nested interface, keyed by interface name */
  nested: Map<string, PlainObject[]>;
}

function primitiveType(value: unknown): string {
  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
      return typeof value;
    default:
      return "any";
  }
}

function addNested(
  nested: Map<string, PlainObject[]>,
  name: string,
  sample: PlainObject,
): void {
  const existing = nested.get(name);
  if (existing) existing.push(sample);
  else nested.set(name, [sample]);
}

/**
 * Works out one property's type from every value seen for it across all
 * sample records, so a field that is null in any record becomes `T | null`.
 */
function analyzeProperty(
  key: string,
  values: unknown[],
  totalSamples: number,
): PropertyInfo {
  const nested = new Map<string, PlainObject[]>();
  const nullable = values.some((v) => v === null);
  const present = values.filter((v) => v !== null && v !== undefined);
  const objectName = toPascalCase(key);
  const itemName = toPascalCase(singularize(key));

  const types = new Set<string>();
  const elementTypes = new Set<string>();
  let sawArray = false;

  for (const value of present) {
    if (Array.isArray(value)) {
      sawArray = true;
      for (const element of value) {
        if (isPlainObject(element)) {
          elementTypes.add(itemName);
          addNested(nested, itemName, element);
        } else if (element !== null && element !== undefined) {
          elementTypes.add(primitiveType(element));
        }
      }
    } else if (isPlainObject(value)) {
      types.add(objectName);
      addNested(nested, objectName, value);
    } else {
      types.add(primitiveType(value));
    }
  }

  if (sawArray) {
    const element =
      elementTypes.size === 0 || elementTypes.has("any")
        ? "any"
        : [...elementTypes].join(" | ");
    types.add(elementTypes.size > 1 && element !== "any" ? `(${element})[]` : `${element}[]`);
  }

  let type = types.size === 0 || types.has("any") ? "any" : [...types].join(" | ");
  // `any | null` is just `any`
  if (nullable && type !== "any") type = `${type} | null`;

  return {
    name: key,
    type,
    optional: values.length < totalSamples,
    nested,
  };
}

/** Union of keys across all samples, in first-seen order. */
function unionKeys(samples: PlainObject[]): string[] {
  const keys = new Set<string>();
  for (const sample of samples) {
    for (const key of Object.keys(sample)) keys.add(key);
  }
  return [...keys];
}

function formatProperties(properties: PropertyInfo[]): string {
  return properties
    .map((prop) => {
      // Quote property names if they are not valid JS/TS identifiers
      const propName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(prop.name)
        ? prop.name
        : `"${prop.name}"`;
      return `    ${propName}${prop.optional ? "?" : ""}: ${prop.type};`;
    })
    .join("\n");
}

/**
 * Generates TypeScript interface definitions from a JSON object or array.
 * Every record in an array is inspected, so fields that are null or missing in
 * some records are typed as `T | null` / optional.
 * @param json The input JSON data (object or array).
 * @param rootInterfaceName The desired name for the root interface (or root element interface if JSON is an array).
 * @returns An array of objects, each containing an interface name and its code string.
 */
export function generateTypeScriptInterfaces(
  json: unknown,
  rootInterfaceName: string = "Root",
): TypeScriptInterface[] {
  const interfaces: TypeScriptInterface[] = [];
  // Samples for every interface name, in first-seen order. Objects that map to
  // the same name (e.g. `billing.address` and `shipping.address`) are merged
  // into one interface so no fields are dropped.
  const samplesByName = new Map<string, PlainObject[]>();

  function collect(samples: PlainObject[], interfaceName: string) {
    const name = toPascalCase(interfaceName);
    if (samples.length === 0) return;
    const existing = samplesByName.get(name);
    if (existing) existing.push(...samples);
    else samplesByName.set(name, [...samples]);

    for (const key of unionKeys(samples)) {
      const values = samples.filter((s) => key in s).map((s) => s[key]);
      analyzeProperty(key, values, samples.length).nested.forEach(
        (nestedSamples, nestedName) => collect(nestedSamples, nestedName),
      );
    }
  }

  function generateInterface(samples: PlainObject[], name: string) {
    const properties = unionKeys(samples).map((key) => {
      const values = samples.filter((s) => key in s).map((s) => s[key]);
      return analyzeProperty(key, values, samples.length);
    });
    interfaces.push({
      interfaceName: name,
      code: `export interface ${name} {\n${formatProperties(properties)}\n}`,
    });
  }

  function generateAll(samples: PlainObject[], rootName: string) {
    collect(samples, rootName);
    samplesByName.forEach((s, name) => generateInterface(s, name));
  }

  // --- Handle the root level ---
  if (Array.isArray(json)) {
    const listName = toPascalCase(rootInterfaceName + "List");
    const objects = json.filter(isPlainObject);

    if (objects.length > 0) {
      const elementName = toPascalCase(rootInterfaceName);
      generateAll(objects, elementName);
      interfaces.push({
        interfaceName: listName,
        code: `export type ${listName} = ${elementName}[];`,
      });
    } else {
      const element = json.length > 0 ? primitiveType(json[0]) : "any";
      interfaces.push({
        interfaceName: listName,
        code: `export type ${listName} = ${element}[];`,
      });
    }
  } else if (isPlainObject(json)) {
    generateAll([json], rootInterfaceName);
  } else {
    console.error(
      "Cannot generate TypeScript interfaces: Root JSON value is not an object or array.",
    );
    interfaces.push({
      interfaceName: "Error",
      code: `// Cannot generate TypeScript interfaces: Root JSON value is not an object or array.`,
    });
  }

  return interfaces;
}

export interface TypeScriptTab {
  id: string;
  title: string;
  content: string;
  language: string;
}

/**
 * Builds the tabs shown in the code generation modal. When there is more than
 * one interface, the first tab ("All") holds every definition so it can be
 * copied in one go.
 */
export function buildTypeScriptTabs(
  interfaces: TypeScriptInterface[],
): TypeScriptTab[] {
  const tabs = interfaces.map((iface) => ({
    id: crypto.randomUUID(),
    title: iface.interfaceName,
    content: iface.code,
    language: "typescript",
  }));

  if (tabs.length > 1) {
    tabs.unshift({
      id: crypto.randomUUID(),
      title: "All",
      content: interfaces.map((iface) => iface.code).join("\n\n"),
      language: "typescript",
    });
  }
  return tabs;
}

export default generateTypeScriptInterfaces;
