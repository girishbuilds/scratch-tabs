import { fireEvent, render, screen } from "@testing-library/react";
import { ScratchSearch } from "../components/ScratchSearch";

describe("ScratchSearch", () => {
  it("shows the current query", () => {
    render(<ScratchSearch query="mvn" onChange={jest.fn()} />);
    expect(screen.getByTestId("scratch-search")).toHaveValue("mvn");
  });

  it("reports typing", () => {
    const onChange = jest.fn();
    render(<ScratchSearch query="" onChange={onChange} />);
    fireEvent.change(screen.getByTestId("scratch-search"), { target: { value: "curl" } });
    expect(onChange).toHaveBeenCalledWith("curl");
  });

  it("tells users that secrets are not searched", () => {
    render(<ScratchSearch query="" onChange={jest.fn()} />);
    expect(screen.getByPlaceholderText(/secrets are not searched/i)).toBeInTheDocument();
  });
});
