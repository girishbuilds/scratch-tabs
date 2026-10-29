import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ReconcileProgress } from "../ReconcileProgress";

describe("ReconcileProgress", () => {
  it("announces that the comparison is running and that switching tabs is safe", () => {
    render(<ReconcileProgress />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Comparing sources...");
    expect(status).toHaveTextContent("switch tabs");
  });
});
