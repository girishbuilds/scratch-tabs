import { act, fireEvent, render, screen } from "@testing-library/react";
import { MASK_TEXT, MaskedSegments } from "../components/MaskedSegments";
import type { ScratchSegment } from "../types";

const segments: ScratchSegment[] = [
  { type: "text", text: "Prod-Key: " },
  { type: "secret", index: 0 },
  { type: "text", text: " / " },
  { type: "secret", index: 1 },
];

describe("MaskedSegments", () => {
  it("shows a mask for every secret and the surrounding text", () => {
    const { container } = render(<MaskedSegments segments={segments} />);
    expect(screen.getAllByTestId("scratch-mask")).toHaveLength(2);
    expect(container.textContent).toBe(`Prod-Key: ${MASK_TEXT} / ${MASK_TEXT}`);
  });

  it("uses the same mask regardless of secret length", () => {
    render(<MaskedSegments segments={segments} />);
    const [a, b] = screen.getAllByTestId("scratch-mask");
    expect(a.textContent).toBe(b.textContent);
  });

  it("labels masks for assistive technology without exposing the value", () => {
    render(<MaskedSegments segments={segments} />);
    expect(screen.getAllByLabelText("Hidden secret")).toHaveLength(2);
  });

  it("shows revealed values in place of masks", () => {
    const { container } = render(<MaskedSegments segments={segments} revealed={["abc", "def"]} />);
    expect(screen.queryByTestId("scratch-mask")).toBeNull();
    expect(container.textContent).toBe("Prod-Key: abc / def");
  });

  it("keeps masking any secret whose value is not provided", () => {
    render(<MaskedSegments segments={segments} revealed={["abc"]} />);
    expect(screen.getAllByTestId("scratch-secret-revealed")).toHaveLength(1);
    expect(screen.getAllByTestId("scratch-mask")).toHaveLength(1);
  });

  it("renders plain text when there are no secrets", () => {
    const { container } = render(<MaskedSegments segments={[{ type: "text", text: "mvn clean" }]} />);
    expect(container.textContent).toBe("mvn clean");
  });
});

describe("MaskedSegments click-to-copy", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("renders masks as buttons only when a copy handler is provided", () => {
    const { rerender } = render(<MaskedSegments segments={segments} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    rerender(<MaskedSegments segments={segments} onCopySecret={jest.fn()} />);
    expect(screen.getAllByRole("button", { name: "Copy hidden secret" })).toHaveLength(2);
  });

  it("copies exactly the clicked secret", async () => {
    const onCopySecret = jest.fn().mockResolvedValue(true);
    render(<MaskedSegments segments={segments} onCopySecret={onCopySecret} />);
    await act(async () => {
      fireEvent.click(screen.getAllByTestId("scratch-mask")[1]);
    });
    expect(onCopySecret).toHaveBeenCalledTimes(1);
    expect(onCopySecret).toHaveBeenCalledWith(1);
  });

  it("confirms on the copied mask only, then goes back to bullets", async () => {
    render(<MaskedSegments segments={segments} onCopySecret={jest.fn().mockResolvedValue(true)} />);
    await act(async () => {
      fireEvent.click(screen.getAllByTestId("scratch-mask")[0]);
    });
    const [first, second] = screen.getAllByTestId("scratch-mask");
    expect(first).toHaveTextContent("copied");
    expect(second).toHaveTextContent(MASK_TEXT);
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(screen.getAllByTestId("scratch-mask")[0]).toHaveTextContent(MASK_TEXT);
  });

  it("does not confirm when the copy fails", async () => {
    render(<MaskedSegments segments={segments} onCopySecret={jest.fn().mockResolvedValue(false)} />);
    await act(async () => {
      fireEvent.click(screen.getAllByTestId("scratch-mask")[0]);
    });
    expect(screen.getAllByTestId("scratch-mask")[0]).toHaveTextContent(MASK_TEXT);
  });

  it("shows revealed values as plain selectable text, not buttons", () => {
    render(<MaskedSegments segments={segments} revealed={["abc", "def"]} onCopySecret={jest.fn()} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getAllByTestId("scratch-secret-revealed")).toHaveLength(2);
  });
});

describe("MaskedSegments not-a-secret", () => {
  it("offers it next to a revealed secret only when a handler is provided", () => {
    const { rerender } = render(<MaskedSegments segments={segments} revealed={["abc", "def"]} />);
    expect(screen.queryByTestId("scratch-not-secret")).toBeNull();
    rerender(<MaskedSegments segments={segments} revealed={["abc", "def"]} onNotSecret={jest.fn()} />);
    expect(screen.getAllByTestId("scratch-not-secret")).toHaveLength(2);
  });

  it("does not offer it while a secret is masked", () => {
    render(<MaskedSegments segments={segments} onNotSecret={jest.fn()} />);
    expect(screen.queryByTestId("scratch-not-secret")).toBeNull();
  });

  it("reports which secret was unmasked", () => {
    const onNotSecret = jest.fn();
    render(<MaskedSegments segments={segments} revealed={["abc", "def"]} onNotSecret={onNotSecret} />);
    fireEvent.click(screen.getAllByTestId("scratch-not-secret")[1]);
    expect(onNotSecret).toHaveBeenCalledWith(1);
  });
});
