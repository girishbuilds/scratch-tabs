import React from "react";
import { render, screen } from "@testing-library/react";
import { WelcomeHero } from "../WelcomeHero";
import { useThemeStore } from "../../../stores/themeStore";

describe("WelcomeHero", () => {
  it("shows the product name and benefit-led tagline", () => {
    render(<WelcomeHero />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("SCRATCH_TABS");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "The missing half of your dev environment.",
    );
  });

  it("makes the product name the largest text", () => {
    render(<WelcomeHero />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("text-2xl", "md:text-4xl");
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("md:text-lg");
  });

  it("uses the dark logo in dark mode", () => {
    useThemeStore.setState({ isDarkMode: true });
    render(<WelcomeHero />);

    expect(screen.getByAltText("Scratch Tabs Logo")).toHaveAttribute("src", "/favicon-gray.svg");
  });

  it("uses the black logo in light mode so it stays visible", () => {
    useThemeStore.setState({ isDarkMode: false });
    render(<WelcomeHero />);

    expect(screen.getByAltText("Scratch Tabs Logo")).toHaveAttribute("src", "/favicon.svg");
  });

  it("lists the trust badges", () => {
    render(<WelcomeHero />);

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Private by design",
      "Works offline",
      "Saved locally",
    ]);
  });

  it("does not show the version number", () => {
    render(<WelcomeHero />);

    expect(screen.queryByText(/v\d+\.\d+/)).not.toBeInTheDocument();
  });
});
