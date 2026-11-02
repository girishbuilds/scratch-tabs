import { isPlaceholder } from "../../services/detection/placeholders";

describe("isPlaceholder", () => {
  it.each([
    "your-token-here",
    "<token>",
    "{{API_KEY}}",
    "${TOKEN}",
    "$TOKEN",
    "%TOKEN%",
    "xxxxxxxx",
    "********",
    "••••",
    "changeme",
    "REDACTED",
    "my-secret-value",
    "example-key",
    "some-value-here",
    "  <token>  ",
  ])("treats %j as a placeholder", (value) => {
    expect(isPlaceholder(value)).toBe(true);
  });

  it.each(["3knd8dsuhds89hds", "hunter22", "correct horse battery"])(
    "treats %j as a real value",
    (value) => {
      expect(isPlaceholder(value)).toBe(false);
    },
  );
});
