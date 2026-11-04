import { useCallback } from "react";
import * as monaco from "monaco-editor";
import { Tab } from "../../../types";
import { useJsonModals } from "./useJsonModals";
import { generateJavaClasses } from "../utils/javaGenerator";
import { generateTypeScriptInterfaces, buildTypeScriptTabs } from "../utils/generateTypeScriptInterfaces";
import { generatePythonClasses } from "../utils/generatePythonClasses";
import { generateGoStructs } from "../utils/generateGoStructs";
import { generateCSharpClasses } from "../utils/generateCSharpClasses";
import { convertToCsv } from "../utils/generateCsv";
import { convertToYaml } from "../utils/generateYaml";
import { convertToXml } from "../utils/generateXml";
import { generateJsonSchema } from "../utils/jsonSchema";

export const useJsonConversions = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  addTab: (tab: Tab) => void,
) => {
  const { openCodeGenerationModal, openTreeViewModal, openCsvExportOptionsModal } = useJsonModals();

  const handleToJava = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();

      const json = JSON.parse(content);

      // Generate Java classes
      const javaClasses = generateJavaClasses(json);

      // Create tabs for each class
      const tabs = javaClasses.map((javaClass) => ({
        id: crypto.randomUUID(),
        title: javaClass.className,
        content: javaClass.code,
        language: "java",
      }));

      // Open the code generation modal with the Java classes
      openCodeGenerationModal(tabs, addTab);
    } catch (error) {
      console.error("Failed to convert to Java:", error);
    }
  }, [editor, openCodeGenerationModal, addTab]);

  const handleTreeView = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();

      openTreeViewModal(content);
    } catch (error) {
      console.error("Failed to convert to tree view:", error);
    }
  }, [editor, openTreeViewModal]);

  const handleToTypeScript = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();

      const json = JSON.parse(content);

      const tsInterfaces = generateTypeScriptInterfaces(json);
      const tabs = buildTypeScriptTabs(tsInterfaces);

      openCodeGenerationModal(tabs, addTab);
    } catch (error) {
      console.error("Failed to convert to TypeScript:", error);
    }
  }, [editor, openCodeGenerationModal, addTab]);

  const handleToPython = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();

      const json = JSON.parse(content);

      const pythonClasses = generatePythonClasses(json);
      const tabs = pythonClasses.map((pythonClass) => ({
        id: crypto.randomUUID(),
        title: pythonClass.className,
        content: pythonClass.code,
        language: "python",
      }));

      openCodeGenerationModal(tabs, addTab);
    } catch (error) {
      console.error("Failed to convert to Python:", error);
    }
  }, [editor, openCodeGenerationModal, addTab]);

  const handleToGo = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();

      const json = JSON.parse(content);

      const goStructs = generateGoStructs(json);
      const tabs = goStructs.map((goStruct) => ({
        id: crypto.randomUUID(),
        title: goStruct.structName,
        content: goStruct.code,
        language: "go",
      }));

      openCodeGenerationModal(tabs, addTab);
    } catch (error) {
      console.error("Failed to convert to Go:", error);
    }
  }, [editor, openCodeGenerationModal, addTab]);

  const handleToCSharp = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();

      const json = JSON.parse(content);

      const csharpClasses = generateCSharpClasses(json);
      const tabs = csharpClasses.map((csharpClass) => ({
        id: crypto.randomUUID(),
        title: csharpClass.className,
        content: csharpClass.code,
        language: "csharp",
      }));

      openCodeGenerationModal(tabs, addTab);
    } catch (error) {
      console.error("Failed to convert to C#:", error);
    }
  }, [editor, openCodeGenerationModal, addTab]);

  const handleToCsv = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();
      // Open the CSV export options modal instead of directly generating
      openCsvExportOptionsModal(content);
    } catch (error) {
      console.error("Failed to open CSV export modal:", error);
    }
  }, [editor, openCsvExportOptionsModal]);

  const handleToYaml = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();

      const json = JSON.parse(content);

      const yaml = convertToYaml(json);
      const tab = {
        id: crypto.randomUUID(),
        title: "Converted YAML",
        content: yaml,
        language: "yaml",
      };

      openCodeGenerationModal([tab], addTab);
    } catch (error) {
      console.error("Failed to convert to YAML:", error);
    }
  }, [editor, openCodeGenerationModal, addTab]);

  const handleToXml = useCallback(() => {
    if (!editor) return;
    try {
      const content = editor.getValue();

      const json = JSON.parse(content);

      const xml = convertToXml(json);
      const tab = {
        id: crypto.randomUUID(),
        title: "Converted XML",
        content: xml,
        language: "xml",
      };

      openCodeGenerationModal([tab], addTab);
    } catch (error) {
      console.error("Failed to convert to XML:", error);
    }
  }, [editor, openCodeGenerationModal, addTab]);

  const handleValidateSchema = useCallback(() => {
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
  }, [editor, openCodeGenerationModal, addTab]);

  return {
    handleTreeView,
    handleToJava,
    handleToTypeScript,
    handleToPython,
    handleToGo,
    handleToCSharp,
    handleToCsv,
    handleToYaml,
    handleToXml,
    handleValidateSchema,
  };
};
