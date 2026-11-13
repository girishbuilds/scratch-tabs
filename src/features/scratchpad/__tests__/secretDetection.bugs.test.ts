/**
 * Failing tests documenting confirmed bugs in Scratch secret detection.
 * Masking is the whole point of the feature: a missed secret is shown in plain
 * text in the drawer (and during screen share).
 */
import { detectSecretSpans } from "../services/secretDetection";

const masked = (text: string): string[] =>
  detectSecretSpans(text).map(({ start, end }) => text.slice(start, end));

describe("BUG: placeholder filter lets real secrets through", () => {
  it("masks a password that starts with 'my-' / 'my_'", () => {
    expect(masked("password: my_Dog-Rex1985!")).toEqual(["my_Dog-Rex1985!"]);
  });

  it("masks a password that starts with 'example' as part of a longer word", () => {
    expect(masked("password: examplePass#9917")).toEqual(["examplePass#9917"]);
  });
});
