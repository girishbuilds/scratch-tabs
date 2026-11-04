import { describe, it, expect, beforeEach } from "@jest/globals";
import { operationRegistry } from "../OperationRegistry";
import {
  createExecutionContext,
  executeStep,
  executePipeline,
  executeSingleOperation,
  validatePipeline,
  ProgressCallback,
} from "../pipelineExecutor";
import { Pipeline, PipelineStep, OperationDefinition } from "../types";

describe("pipelineExecutor", () => {
  beforeEach(() => {
    // Clear the registry before each test
    operationRegistry.clear();

    // Register test operations
    const testOperations: OperationDefinition[] = [
      {
        id: "test.uppercase",
        name: "Uppercase",
        description: "Convert to uppercase",
        categories: ["test"],
        parameters: [],
        execute: (input) => input.toUpperCase(),
      },
      {
        id: "test.lowercase",
        name: "Lowercase",
        description: "Convert to lowercase",
        categories: ["test"],
        parameters: [],
        execute: (input) => input.toLowerCase(),
      },
      {
        id: "test.trim",
        name: "Trim",
        description: "Trim whitespace",
        categories: ["test"],
        parameters: [],
        execute: (input) => input.trim(),
      },
      {
        id: "test.prefix",
        name: "Add Prefix",
        description: "Add prefix to input",
        categories: ["test"],
        parameters: [
          { name: "prefix", label: "Prefix", type: "string", default: "" },
        ],
        execute: (input, params) => `${params.prefix || ""}${input}`,
      },
      {
        id: "test.suffix",
        name: "Add Suffix",
        description: "Add suffix to input",
        categories: ["test"],
        parameters: [
          { name: "suffix", label: "Suffix", type: "string", default: "" },
        ],
        execute: (input, params) => `${input}${params.suffix || ""}`,
      },
      {
        id: "test.error",
        name: "Error Operation",
        description: "Always throws an error",
        categories: ["test"],
        parameters: [],
        execute: () => {
          throw new Error("Intentional test error");
        },
      },
      {
        id: "test.async",
        name: "Async Operation",
        description: "Async operation that delays",
        categories: ["test"],
        parameters: [],
        execute: async (input) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return input.split("").reverse().join("");
        },
      },
      {
        id: "test.warns",
        name: "Warns",
        description: "Reports a warning",
        categories: ["test"],
        parameters: [],
        execute: (input, _params, context) => {
          context.warn?.("something looks off");
          return `${input}!`;
        },
      },
      {
        id: "test.uppercase-strict",
        name: "Uppercase (strict)",
        description: "Uppercases and opts in to the unchanged-input warning",
        categories: ["test"],
        parameters: [],
        warnIfUnchanged: true,
        execute: (input) => input.toUpperCase(),
      },
      {
        id: "test.context-aware",
        name: "Context Aware",
        description: "Uses execution context",
        categories: ["test"],
        parameters: [],
        execute: (input, _params, context) => {
          return `step:${context.stepIndex},total:${context.totalSteps},input:${context._input}`;
        },
      },
    ];

    testOperations.forEach((op) => operationRegistry.register(op));
  });

  describe("createExecutionContext", () => {
    it("should create context with correct properties", () => {
      const context = createExecutionContext("original", 2, 5, "previous");

      expect(context.stepIndex).toBe(2);
      expect(context.totalSteps).toBe(5);
      expect(context._input).toBe("original");
      expect(context._previousOutput).toBe("previous");
      expect(context._stepIndex).toBe(2);
    });

    it("should create context with empty variables map by default", () => {
      const context = createExecutionContext("input", 0, 1, "");

      expect(context.variables).toBeInstanceOf(Map);
      expect(context.variables.size).toBe(0);
    });

    it("should allow getting and setting variables", () => {
      const context = createExecutionContext("input", 0, 1, "");

      context.setVariable("foo", "bar");
      expect(context.getVariable("foo")).toBe("bar");
      expect(context.getVariable("nonexistent")).toBeUndefined();
    });

    it("should use provided variables map", () => {
      const variables = new Map<string, string>();
      variables.set("existing", "value");

      const context = createExecutionContext("input", 0, 1, "", variables);

      expect(context.getVariable("existing")).toBe("value");
    });
  });

  describe("executeStep", () => {
    it("should execute a simple operation", async () => {
      const step: PipelineStep = {
        id: "step1",
        operationId: "test.uppercase",
        params: {},
        enabled: true,
      };
      const context = createExecutionContext("hello", 0, 1, "");

      const result = await executeStep(step, "hello", context);

      expect(result.output).toBe("HELLO");
      expect(result.skipped).toBe(false);
      expect(result.error).toBeUndefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should surface a warning reported by the operation", async () => {
      const step: PipelineStep = { id: "s", operationId: "test.warns", params: {}, enabled: true };
      const result = await executeStep(step, "hi", createExecutionContext("hi", 0, 1, ""));

      expect(result.error).toBeUndefined();
      expect(result.output).toBe("hi!");
      expect(result.warning).toBe("something looks off");
    });

    it("should warn when an opted-in step leaves the input unchanged", async () => {
      const step: PipelineStep = { id: "s", operationId: "test.uppercase-strict", params: {}, enabled: true };
      const result = await executeStep(step, "ALREADY", createExecutionContext("ALREADY", 0, 1, ""));

      expect(result.error).toBeUndefined();
      expect(result.warning).toMatch(/did not change/i);
    });

    it("should not warn about unchanged input for operations that did not opt in", async () => {
      const step: PipelineStep = { id: "s", operationId: "test.uppercase", params: {}, enabled: true };
      const result = await executeStep(step, "ALREADY", createExecutionContext("ALREADY", 0, 1, ""));

      expect(result.warning).toBeUndefined();
    });

    it("should not warn when a step changes the input or is skipped", async () => {
      const changed = await executeStep(
        { id: "s", operationId: "test.uppercase", params: {}, enabled: true },
        "hello",
        createExecutionContext("hello", 0, 1, ""),
      );
      const skipped = await executeStep(
        { id: "s", operationId: "test.uppercase", params: {}, enabled: false },
        "hello",
        createExecutionContext("hello", 0, 1, ""),
      );
      expect(changed.warning).toBeUndefined();
      expect(skipped.warning).toBeUndefined();
    });

    it("should skip disabled steps", async () => {
      const step: PipelineStep = {
        id: "step1",
        operationId: "test.uppercase",
        params: {},
        enabled: false,
      };
      const context = createExecutionContext("hello", 0, 1, "");

      const result = await executeStep(step, "hello", context);

      expect(result.output).toBe("hello"); // Unchanged
      expect(result.skipped).toBe(true);
      expect(result.duration).toBe(0);
    });

    it("should handle missing operations", async () => {
      const step: PipelineStep = {
        id: "step1",
        operationId: "nonexistent.operation",
        params: {},
        enabled: true,
      };
      const context = createExecutionContext("hello", 0, 1, "");

      const result = await executeStep(step, "hello", context);

      expect(result.output).toBe("hello"); // Returns original
      expect(result.error).toContain("not found in registry");
    });

    it("should handle operation errors", async () => {
      const step: PipelineStep = {
        id: "step1",
        operationId: "test.error",
        params: {},
        enabled: true,
      };
      const context = createExecutionContext("hello", 0, 1, "");

      const result = await executeStep(step, "hello", context);

      expect(result.output).toBe("hello"); // Returns original on error
      expect(result.error).toBe("Intentional test error");
    });

    it("should pass parameters to operation", async () => {
      const step: PipelineStep = {
        id: "step1",
        operationId: "test.prefix",
        params: { prefix: ">>> " },
        enabled: true,
      };
      const context = createExecutionContext("hello", 0, 1, "");

      const result = await executeStep(step, "hello", context);

      expect(result.output).toBe(">>> hello");
    });

    it("should pass context to operation", async () => {
      const step: PipelineStep = {
        id: "step1",
        operationId: "test.context-aware",
        params: {},
        enabled: true,
      };
      const context = createExecutionContext("original", 2, 5, "previous");

      const result = await executeStep(step, "current", context);

      expect(result.output).toBe("step:2,total:5,input:original");
    });

    it("should handle async operations", async () => {
      const step: PipelineStep = {
        id: "step1",
        operationId: "test.async",
        params: {},
        enabled: true,
      };
      const context = createExecutionContext("hello", 0, 1, "");

      const result = await executeStep(step, "hello", context);

      expect(result.output).toBe("olleh"); // Reversed
      expect(result.duration).toBeGreaterThan(0);
    });

    it("should convert non-string output to string", async () => {
      operationRegistry.register({
        id: "test.number",
        name: "Return Number",
        description: "Returns a number",
        categories: ["test"],
        parameters: [],
        execute: () => 42 as any,
      });

      const step: PipelineStep = {
        id: "step1",
        operationId: "test.number",
        params: {},
        enabled: true,
      };
      const context = createExecutionContext("input", 0, 1, "");

      const result = await executeStep(step, "input", context);

      expect(result.output).toBe("42");
    });

    it("should record step metadata correctly", async () => {
      const step: PipelineStep = {
        id: "my-step-id",
        operationId: "test.uppercase",
        params: {},
        enabled: true,
      };
      const context = createExecutionContext("hello", 0, 1, "");

      const result = await executeStep(step, "hello", context);

      expect(result.stepId).toBe("my-step-id");
      expect(result.operationId).toBe("test.uppercase");
      expect(result.input).toBe("hello");
    });
  });

  describe("executePipeline", () => {
    it("should execute a single step pipeline", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
        ],
      };

      const result = await executePipeline("hello world", pipeline);

      expect(result.success).toBe(true);
      expect(result.output).toBe("HELLO WORLD");
      expect(result.stepResults).toHaveLength(1);
    });

    it("should chain multiple steps", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.trim",
            params: {},
            enabled: true,
          },
          {
            id: "step2",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
          {
            id: "step3",
            operationId: "test.prefix",
            params: { prefix: ">>> " },
            enabled: true,
          },
        ],
      };

      const result = await executePipeline("  hello world  ", pipeline);

      expect(result.success).toBe(true);
      expect(result.output).toBe(">>> HELLO WORLD");
    });

    it("should skip disabled steps", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
          {
            id: "step2",
            operationId: "test.lowercase",
            params: {},
            enabled: false,
          },
        ],
      };

      const result = await executePipeline("Hello", pipeline);

      expect(result.success).toBe(true);
      expect(result.output).toBe("HELLO"); // Lowercase was skipped
      expect(result.stepResults[1].skipped).toBe(true);
    });

    it("should stop on error and return partial results", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
          {
            id: "step2",
            operationId: "test.error",
            params: {},
            enabled: true,
          },
          {
            id: "step3",
            operationId: "test.lowercase",
            params: {},
            enabled: true,
          },
        ],
      };

      const result = await executePipeline("hello", pipeline);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Intentional test error");
      expect(result.stepResults).toHaveLength(2); // Stops at error step
    });

    it("should call progress callback", async () => {
      const progressCalls: Array<{ step: number; total: number }> = [];
      const onProgress: ProgressCallback = (step, total) => {
        progressCalls.push({ step, total });
      };

      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
          {
            id: "step2",
            operationId: "test.lowercase",
            params: {},
            enabled: true,
          },
        ],
      };

      await executePipeline("hello", pipeline, {}, onProgress);

      expect(progressCalls).toEqual([
        { step: 0, total: 2 },
        { step: 1, total: 2 },
      ]);
    });

    it("should handle empty pipeline", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [],
      };

      const result = await executePipeline("hello", pipeline);

      expect(result.success).toBe(true);
      expect(result.output).toBe("hello");
      expect(result.stepResults).toHaveLength(0);
    });

    it("should reject oversized input", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
        ],
      };

      const largeInput = "x".repeat(2000);
      const result = await executePipeline(largeInput, pipeline, {
        maxInputSize: 1000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("exceeds maximum");
    });

    it("should reject pipelines with too many steps", async () => {
      const steps: PipelineStep[] = Array.from({ length: 60 }, (_, i) => ({
        id: `step${i}`,
        operationId: "test.uppercase",
        params: {},
        enabled: true,
      }));

      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps,
      };

      const result = await executePipeline("hello", pipeline, { maxSteps: 50 });

      expect(result.success).toBe(false);
      expect(result.error).toContain("maximum allowed is 50");
    });

    it("should track total duration", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.async",
            params: {},
            enabled: true,
          },
        ],
      };

      const result = await executePipeline("hello", pipeline);

      expect(result.totalDuration).toBeGreaterThan(0);
    });

    it("should handle variable assignment", async () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
            assignTo: "upperResult",
          },
        ],
      };

      const result = await executePipeline("hello", pipeline);

      expect(result.success).toBe(true);
      expect(result.variables).toEqual({ upperResult: "HELLO" });
    });
  });

  describe("executeSingleOperation", () => {
    it("should execute a single operation", async () => {
      const result = await executeSingleOperation("test.uppercase", "hello");

      expect(result.success).toBe(true);
      expect(result.output).toBe("HELLO");
    });

    it("should pass parameters", async () => {
      const result = await executeSingleOperation("test.prefix", "world", {
        prefix: "Hello, ",
      });

      expect(result.success).toBe(true);
      expect(result.output).toBe("Hello, world");
    });

    it("should handle missing operations", async () => {
      const result = await executeSingleOperation("nonexistent", "hello");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should handle operation errors", async () => {
      const result = await executeSingleOperation("test.error", "hello");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Intentional test error");
    });

    it("should handle async operations", async () => {
      const result = await executeSingleOperation("test.async", "hello");

      expect(result.success).toBe(true);
      expect(result.output).toBe("olleh");
    });
  });

  describe("validatePipeline", () => {
    it("should validate a valid pipeline", () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
        ],
      };

      const result = validatePipeline(pipeline);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty pipeline", () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [],
      };

      const result = validatePipeline(pipeline);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Pipeline has no steps");
    });

    it("should detect missing operations", () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "nonexistent.operation",
            params: {},
            enabled: true,
          },
        ],
      };

      const result = validatePipeline(pipeline);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("not found in registry");
    });

    it("should detect missing step IDs", () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "",
            operationId: "test.uppercase",
            params: {},
            enabled: true,
          },
        ],
      };

      const result = validatePipeline(pipeline);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Missing step ID");
    });

    it("should detect missing operation IDs", () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "step1",
            operationId: "",
            params: {},
            enabled: true,
          },
        ],
      };

      const result = validatePipeline(pipeline);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Missing operation ID");
    });

    it("should report multiple errors", () => {
      const pipeline: Pipeline = {
        id: "test-pipeline",
        name: "Test Pipeline",
        steps: [
          {
            id: "",
            operationId: "nonexistent1",
            params: {},
            enabled: true,
          },
          {
            id: "step2",
            operationId: "nonexistent2",
            params: {},
            enabled: true,
          },
        ],
      };

      const result = validatePipeline(pipeline);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
