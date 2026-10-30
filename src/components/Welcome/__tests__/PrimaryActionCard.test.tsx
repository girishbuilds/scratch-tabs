import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { FileText } from "../../Icons";
import { PrimaryActionCard, PrimaryActionCardProps } from "../PrimaryActionCard";

describe("PrimaryActionCard", () => {
  const onClick = jest.fn();

  const renderCard = (overrides: Partial<PrimaryActionCardProps> = {}) =>
    render(
      <PrimaryActionCard
        icon={FileText}
        title="New Scratch Tab"
        description="Start writing"
        ctaLabel="Create tab"
        onClick={onClick}
        variant="primary"
        {...overrides}
      />,
    );

  beforeEach(() => jest.clearAllMocks());

  it("renders title, description and call-to-action", () => {
    renderCard();

    expect(screen.getByText("New Scratch Tab")).toBeInTheDocument();
    expect(screen.getByText("Start writing")).toBeInTheDocument();
    expect(screen.getByText("Create tab")).toBeInTheDocument();
  });

  it("is a single button that calls onClick", () => {
    renderCard();

    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /new scratch tab/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("emphasises the primary variant with a filled call-to-action", () => {
    renderCard({ variant: "primary" });

    expect(screen.getByRole("button")).toHaveClass("border-primary/40", "bg-primary/5");
    expect(screen.getByText("Create tab")).toHaveClass("bg-primary", "text-white");
  });

  it("keeps the neutral variant quiet", () => {
    renderCard({ variant: "neutral" });

    expect(screen.getByRole("button")).toHaveClass("bg-surface", "border-base");
    expect(screen.getByText("Create tab")).not.toHaveClass("bg-primary");
  });

  it("hides the call-to-action on mobile", () => {
    renderCard();

    expect(screen.getByText("Create tab")).toHaveClass("hidden", "md:block");
  });
});
