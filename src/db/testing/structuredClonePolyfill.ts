// jsdom does not expose structuredClone, which fake-indexeddb needs to copy records.
import { deserialize, serialize } from "v8";

if (typeof (globalThis as any).structuredClone !== "function") {
  (globalThis as any).structuredClone = <T>(value: T): T => deserialize(serialize(value));
}
