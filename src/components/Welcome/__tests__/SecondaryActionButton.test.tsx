import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { File } from "../../Icons";
import { SecondaryActionButton } from "../SecondaryActionButton";

describe("SecondaryActionButton", () => {
  it("renders the title and calls onClick", () => {
    const onClick = jest.fn();
    render(<SecondaryActionButton icon={File} title="Open File" onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Open File" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
