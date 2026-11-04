import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { useJsonModals } from "../../hooks/useJsonModals";
import { Tab } from "../../../../types";
import {
  flattenJson,
  unflattenJson,
  removeEmptyValues,
  removeComments,
  extractJsonFromContent,
  applyEditToEditor,
} from "../../actions/jsonOperations";
import {
  transformToCamelCase,
  transformToSnakeCase,
  transformToKebabCase,
} from "../../actions/jsonTransformations";
import { generateJsonSchema } from "../../utils/jsonSchema";

interface ToolboxProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  onContentChange: (content: string) => void;
  addTab: (tab: Tab) => void;
}

interface AccordionSectionProps {
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  children,
  isExpanded,
  onToggle,
}) => {
  return (
    <div className="border-b border-base">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-element-hover transition-colors"
      >
        <span className="text-xs font-medium text-main">{title}</span>
        {isExpanded ? (
          <ChevronDown size={16} className="text-main" />
        ) : (
          <ChevronRight size={16} className="text-main" />
        )}
      </button>
      {isExpanded && (
        <div className="p-3 pt-0 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
};

interface ActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  children,
  disabled = false,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${disabled
        ? "text-muted cursor-not-allowed"
        : "text-main hover:bg-element-hover"
      }`}
  >
    {children}
  </button>
);

export const Toolbox: React.FC<ToolboxProps> = ({
  editor,
  onContentChange,
  addTab,
}) => {
  const [expandedSection, setExpandedSection] = useState<string>("Transformations");
  const {
    openCodeGenerationModal,
    openSchemaValidationModal,
    openExtractDataModal,
    openCsvExportOptionsModal,
  } = useJsonModals();

  const executeTransformation = (transformFn: (content: string) => string) => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      const result = transformFn(content);
      applyEditToEditor(editor, result, "transformation");
    } catch (error) {
      console.error("Transformation failed:", error);
    }
  };

  const handleCodeGeneration = (language: string) => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);

      // Import the appropriate generator dynamically
      switch (language) {
        case "typescript":
          import("../../utils/generateTypeScriptInterfaces").then(({ generateTypeScriptInterfaces, buildTypeScriptTabs }) => {
            const tabs = buildTypeScriptTabs(generateTypeScriptInterfaces(json));
            openCodeGenerationModal(tabs, addTab);
          });
          break;
        case "java":
          import("../../utils/javaGenerator").then(({ generateJavaClasses }) => {
            const classes = generateJavaClasses(json);
            const tabs = classes.map((cls) => ({
              id: crypto.randomUUID(),
              title: cls.className,
              content: cls.code,
              language: "java",
            }));
            openCodeGenerationModal(tabs, addTab);
          });
          break;
        case "python":
          import("../../utils/generatePythonClasses").then(({ generatePythonClasses }) => {
            const classes = generatePythonClasses(json);
            const tabs = classes.map((cls) => ({
              id: crypto.randomUUID(),
              title: cls.className,
              content: cls.code,
              language: "python",
            }));
            openCodeGenerationModal(tabs, addTab);
          });
          break;
        case "go":
          import("../../utils/generateGoStructs").then(({ generateGoStructs }) => {
            const structs = generateGoStructs(json);
            const tabs = structs.map((struct) => ({
              id: crypto.randomUUID(),
              title: struct.structName,
              content: struct.code,
              language: "go",
            }));
            openCodeGenerationModal(tabs, addTab);
          });
          break;
        case "csharp":
          import("../../utils/generateCSharpClasses").then(({ generateCSharpClasses }) => {
            const classes = generateCSharpClasses(json);
            const tabs = classes.map((cls) => ({
              id: crypto.randomUUID(),
              title: cls.className,
              content: cls.code,
              language: "csharp",
            }));
            openCodeGenerationModal(tabs, addTab);
          });
          break;
      }
    } catch (error) {
      console.error(`Failed to generate ${language}:`, error);
    }
  };

  const handleDataConversion = (format: string) => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);

      switch (format) {
        case "csv":
          // Open CSV export options modal instead of direct conversion
          openCsvExportOptionsModal(content);
          break;
        case "yaml":
          import("../../utils/generateYaml").then(({ convertToYaml }) => {
            const yaml = convertToYaml(json);
            const tab = {
              id: crypto.randomUUID(),
              title: "Converted YAML",
              content: yaml,
              language: "yaml",
            };
            openCodeGenerationModal([tab], addTab);
          });
          break;
        case "xml":
          import("../../utils/generateXml").then(({ convertToXml }) => {
            const xml = convertToXml(json);
            const tab = {
              id: crypto.randomUUID(),
              title: "Converted XML",
              content: xml,
              language: "xml",
            };
            openCodeGenerationModal([tab], addTab);
          });
          break;
      }
    } catch (error) {
      console.error(`Failed to convert to ${format}:`, error);
    }
  };

  const handleGenerateSchema = () => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      const schema = generateJsonSchema(json);

      const tab = {
        id: crypto.randomUUID(),
        title: "JSON Schema",
        content: JSON.stringify(schema, null, 2),
        language: "json",
      };
      openCodeGenerationModal([tab], addTab);
    } catch (error) {
      console.error("Failed to generate schema:", error);
    }
  };

  const handleValidateSchema = () => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      const json = JSON.parse(content);
      openSchemaValidationModal(json);
    } catch (error) {
      console.error("Failed to validate schema:", error);
    }
  };

  const handleExtractJson = () => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      const extractedJsons = extractJsonFromContent(content);

      if (extractedJsons.length === 0) {
        // No JSON found - could show a toast/notification
        console.log("No JSON found in content");
        return;
      }

      if (extractedJsons.length === 1) {
        // Single JSON found - replace current content
        applyEditToEditor(editor, extractedJsons[0], "extract-json");
      } else {
        // Multiple JSONs found - open in new tabs
        const now = Date.now();
        const tabs: Tab[] = extractedJsons.map((jsonContent, index) => ({
          id: crypto.randomUUID(),
          title: `Extracted JSON ${index + 1}`,
          content: jsonContent,
          language: "json",
          languageLocked: true,
          cursorPosition: { lineNumber: 1, column: 1 },
          dateCreated: now,
          lastModified: now,
          workspaceId: "", // Will be set by the tab system
        }));

        // Create tabs for each extracted JSON
        tabs.forEach(tab => addTab(tab));
      }
    } catch (error) {
      console.error("Failed to extract JSON:", error);
    }
  };

  const handleExtractData = () => {
    if (!editor) return;
    const content = editor.getValue();
    openExtractDataModal(content, addTab);
  };

  return (
    <div className="space-y-0">
      {/* Transformations */}
      <AccordionSection
        title="Transformations"
        isExpanded={expandedSection === "Transformations"}
        onToggle={() => setExpandedSection(expandedSection === "Transformations" ? "" : "Transformations")}
      >
        <ActionButton onClick={handleExtractJson}>
          Extract JSON
        </ActionButton>
        <ActionButton onClick={() => executeTransformation(flattenJson)}>
          Flatten JSON
        </ActionButton>
        <ActionButton onClick={() => executeTransformation(unflattenJson)}>
          Unflatten JSON
        </ActionButton>
        <ActionButton onClick={() => executeTransformation(removeEmptyValues)}>
          Remove Null/Empty
        </ActionButton>
        <ActionButton onClick={() => executeTransformation(removeComments)}>
          Remove Comments
        </ActionButton>
        <ActionButton onClick={() => executeTransformation(transformToCamelCase)}>
          Keys to camelCase
        </ActionButton>
        <ActionButton onClick={() => executeTransformation(transformToSnakeCase)}>
          Keys to snake_case
        </ActionButton>
        <ActionButton onClick={() => executeTransformation(transformToKebabCase)}>
          Keys to kebab-case
        </ActionButton>
      </AccordionSection>

      {/* Data Extraction */}
      <AccordionSection
        title="Data Extraction"
        isExpanded={expandedSection === "Data Extraction"}
        onToggle={() => setExpandedSection(expandedSection === "Data Extraction" ? "" : "Data Extraction")}
      >
        <ActionButton onClick={handleExtractData}>
          Extract Values...
        </ActionButton>
      </AccordionSection>

      {/* Code Generation */}
      <AccordionSection
        title="Code Generation"
        isExpanded={expandedSection === "Code Generation"}
        onToggle={() => setExpandedSection(expandedSection === "Code Generation" ? "" : "Code Generation")}
      >
        <ActionButton onClick={() => handleCodeGeneration("typescript")}>
          Generate TypeScript
        </ActionButton>
        <ActionButton onClick={() => handleCodeGeneration("java")}>
          Generate Java
        </ActionButton>
        <ActionButton onClick={() => handleCodeGeneration("python")}>
          Generate Python
        </ActionButton>
        <ActionButton onClick={() => handleCodeGeneration("go")}>
          Generate Go
        </ActionButton>
        <ActionButton onClick={() => handleCodeGeneration("csharp")}>
          Generate C#
        </ActionButton>
      </AccordionSection>

      {/* Data Conversion */}
      <AccordionSection
        title="Data Conversion"
        isExpanded={expandedSection === "Data Conversion"}
        onToggle={() => setExpandedSection(expandedSection === "Data Conversion" ? "" : "Data Conversion")}
      >
        <ActionButton onClick={() => handleDataConversion("csv")}>
          Convert to CSV
        </ActionButton>
        <ActionButton onClick={() => handleDataConversion("yaml")}>
          Convert to YAML
        </ActionButton>
        <ActionButton onClick={() => handleDataConversion("xml")}>
          Convert to XML
        </ActionButton>
      </AccordionSection>

      {/* Schema & Utilities */}
      <AccordionSection
        title="Schema & Utilities"
        isExpanded={expandedSection === "Schema & Utilities"}
        onToggle={() => setExpandedSection(expandedSection === "Schema & Utilities" ? "" : "Schema & Utilities")}
      >
        <ActionButton onClick={handleGenerateSchema}>
          Generate Schema
        </ActionButton>
        <ActionButton onClick={handleValidateSchema}>
          Validate with Schema
        </ActionButton>
      </AccordionSection>
    </div>
  );
};