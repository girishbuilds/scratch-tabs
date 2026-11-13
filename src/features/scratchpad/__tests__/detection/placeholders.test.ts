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
    "example",
    "example_key_1",
    "your password",
    "  <token>  ",
  ])("treats %j as a placeholder", (value) => {
    expect(isPlaceholder(value)).toBe(true);
  });

  it.each(["3knd8dsuhds89hds", "hunter22", "correct horse battery", "my_Dog-Rex1985!", "examplePass#9917", "your-dog-rex"])(
    "treats %j as a real value",
    (value) => {
      expect(isPlaceholder(value)).toBe(false);
    },
  );
});
