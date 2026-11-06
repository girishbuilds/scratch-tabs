import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PipelineCanvas } from "../PipelineCanvas";
import { operationRegistry } from "../../../services/pipeline";
import { PipelineStep, StepResult } from "../../../services/pipeline/types";

const step = (id: string): PipelineStep => ({
  id,
  operationId: "test.op",
  params: {},
  enabled: true,
});

const result = (stepId: string, extra: Partial<StepResult> = {}): StepResult => ({
  stepId,
  operationId: "test.op",
  input: "a",
  output: "a",
  duration: 3,
  skipped: false,
  ...extra,
});

describe("PipelineCanvas step status", () => {
  beforeAll(() => {
    operationRegistry.register({
      id: "test.op",
      name: "Test Op",
      description: "",
      categories: ["test"],
      parameters: [],
      execute: (i) => i,
    });
  });

  const renderCanvas = (results: StepResult[], steps: PipelineStep[]) =>
    render(
      <PipelineCanvas
        steps={steps}
        stepResults={results}
        onUpdateStep={jest.fn()}
        onRemoveStep={jest.fn()}
        onReorderSteps={jest.fn()}
      />,
    );

  it("shows an amber warning with its message when a step warns", () => {
    renderCanvas([result("a", { warning: "Input is not a JSON string" })], [step("a")]);
    expect(screen.getByTestId("step-status-warning")).toBeInTheDocument();
    expect(screen.getByTestId("step-warning-message")).toHaveTextContent("Input is not a JSON string");
    expect(screen.queryByTestId("step-status-error")).not.toBeInTheDocument();
  });

  it("shows a red error and no warning when a step fails", () => {
    renderCanvas([result("a", { error: "boom", warning: "ignored" })], [step("a")]);
    expect(screen.getByTestId("step-status-error")).toBeInTheDocument();
    expect(screen.queryByTestId("step-status-warning")).not.toBeInTheDocument();
    expect(screen.queryByTestId("step-warning-message")).not.toBeInTheDocument();
  });

  it("shows neither icon for a clean step", () => {
    renderCanvas([result("a")], [step("a")]);
    expect(screen.queryByTestId("step-status-warning")).not.toBeInTheDocument();
    expect(screen.queryByTestId("step-status-error")).not.toBeInTheDocument();
  });
});
