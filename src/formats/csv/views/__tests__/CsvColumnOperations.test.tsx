import * as React from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CsvTableViewer } from "../components/CsvTableViewer";
import { useTabsStore } from "../../../../stores/tabsStore";
import { Tab } from "../../../../types";

Object.defineProperty(Element.prototype, "getBoundingClientRect", {
  value: jest.fn(() => ({
    width: 800,
    height: 600,
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
    x: 0,
    y: 0,
    toJSON: jest.fn(),
  })),
});

const sampleCsv = `Name,Age,City
John Doe,28,New York
Jane Smith,32,San Francisco
Bob Johnson,45,Chicago`;

const makeTab = (overrides: Partial<Tab>): Tab => ({
  id: "t",
  title: "Tab",
  content: "",
  language: "csv",
  languageLocked: false,
  cursorPosition: { lineNumber: 1, column: 1 },
  dateCreated: 0,
  lastModified: 0,
  workspaceId: "default",
  ...overrides,
});

const renderViewer = () =>
  render(
    <CsvTableViewer
      content={sampleCsv}
      onContentChange={jest.fn()}
      tabId="current"
      isActive={true}
      side="left"
    />,
  );

const headerNames = () =>
  screen
    .getAllByTitle("Click to select column. Double-click to rename.")
    .map((header) => header.textContent);

const openColumnMenu = (columnName: string) =>
  fireEvent.contextMenu(
    screen
      .getAllByTitle("Click to select column. Double-click to rename.")
      .find((header) => header.textContent === columnName)!,
  );

describe("CSV column operations in the table viewer", () => {
  beforeEach(() => {
    act(() => {
      useTabsStore.setState({
        tabs: [
          makeTab({ id: "current", title: "Current" }),
          makeTab({
            id: "scores",
            title: "Scores",
            content: "Name,Score\nBob Johnson,70\nJohn Doe,90",
          }),
          makeTab({
            id: "notes",
            title: "Notes",
            language: "plaintext",
            content: "Name,Score\nJane,1",
          }),
        ],
      });
    });
  });

  afterEach(() => {
    act(() => {
      useTabsStore.setState({ tabs: [] });
    });
  });

  describe("move column", () => {
    it("moves a column right from its context menu", () => {
      renderViewer();

      openColumnMenu("Name");
      fireEvent.click(screen.getByTestId("move-column-right"));

      expect(headerNames()).toEqual(["Age", "Name", "City"]);
      expect(screen.queryByTestId("csv-context-menu")).not.toBeInTheDocument();
    });

    it("moves a column left from its context menu", () => {
      renderViewer();

      openColumnMenu("City");
      fireEvent.click(screen.getByTestId("move-column-left"));

      expect(headerNames()).toEqual(["Name", "City", "Age"]);
    });

    it("disables moving left for the first column", () => {
      renderViewer();

      openColumnMenu("Name");

      expect(screen.getByTestId("move-column-left")).toBeDisabled();
      expect(screen.getByTestId("move-column-right")).toBeEnabled();
    });

    it("disables moving right for the last column", () => {
      renderViewer();

      openColumnMenu("City");

      expect(screen.getByTestId("move-column-right")).toBeDisabled();
      expect(screen.getByTestId("move-column-left")).toBeEnabled();
    });

    it("does not offer column moves from a cell context menu", () => {
      renderViewer();

      fireEvent.contextMenu(screen.getByText("John Doe"));

      expect(screen.queryByTestId("move-column-left")).not.toBeInTheDocument();
      expect(screen.queryByTestId("move-column-right")).not.toBeInTheDocument();
    });
  });

  describe("duplicate column", () => {
    it("duplicates a column from its header button", () => {
      renderViewer();

      const ageHeader = screen
        .getAllByTitle("Click to select column. Double-click to rename.")
        .find((header) => header.textContent === "Age")!;
      fireEvent.click(
        within(ageHeader.parentElement!.parentElement!).getByTitle("Duplicate column"),
      );

      expect(headerNames()).toEqual(["Name", "Age", "Age Copy", "City"]);
    });
  });

  describe("add columns from another tab", () => {
    it("opens the panel from the column context menu", () => {
      renderViewer();

      openColumnMenu("Age");
      fireEvent.click(screen.getByTestId("add-columns-from-tab"));

      expect(screen.getByTestId("csv-add-columns-panel")).toBeInTheDocument();
      fireEvent.change(screen.getByTestId("add-columns-source-tab"), {
        target: { value: "scores" },
      });
      expect(screen.getByTestId("add-columns-position")).toHaveValue(
        screen.getByRole("option", { name: "After Age" }).getAttribute("value"),
      );
    });

    it("opens the panel from the toolbar", () => {
      renderViewer();

      fireEvent.click(screen.getByTestId("csv-add-columns-from-tab"));

      expect(screen.getByTestId("csv-add-columns-panel")).toBeInTheDocument();
    });

    it("toggles the panel closed from the toolbar", () => {
      renderViewer();

      fireEvent.click(screen.getByTestId("csv-add-columns-from-tab"));
      fireEvent.click(screen.getByTestId("csv-add-columns-from-tab"));

      expect(screen.queryByTestId("csv-add-columns-panel")).not.toBeInTheDocument();
    });

    it("only offers other CSV tabs as sources", () => {
      renderViewer();

      fireEvent.click(screen.getByTestId("csv-add-columns-from-tab"));

      const options = within(screen.getByTestId("add-columns-source-tab"))
        .getAllByRole("option")
        .map((option) => option.textContent);
      expect(options).toEqual(["Select a tab...", "Scores"]);
    });

    it("shows a message when there are no other CSV tabs", () => {
      act(() => {
        useTabsStore.setState({
          tabs: [
            makeTab({ id: "current", title: "Current" }),
            makeTab({ id: "notes", title: "Notes", language: "plaintext" }),
          ],
        });
      });
      renderViewer();

      fireEvent.click(screen.getByTestId("csv-add-columns-from-tab"));

      expect(screen.getByTestId("add-columns-no-tabs")).toHaveTextContent(
        "No CSV tabs found",
      );
    });

    it("adds the chosen column, matched by the shared Name column", () => {
      renderViewer();

      fireEvent.click(screen.getByTestId("csv-add-columns-from-tab"));
      fireEvent.change(screen.getByTestId("add-columns-source-tab"), {
        target: { value: "scores" },
      });
      fireEvent.click(screen.getByTestId("add-columns-source-column-1"));
      fireEvent.click(screen.getByTestId("add-columns-apply"));

      expect(headerNames()).toEqual(["Name", "Age", "City", "Score"]);
      expect(screen.queryByTestId("csv-add-columns-panel")).not.toBeInTheDocument();
      expect(screen.getByText("90")).toBeInTheDocument();
      expect(screen.getByText("70")).toBeInTheDocument();
    });

    it("inserts after the column the context menu was opened on", () => {
      renderViewer();

      openColumnMenu("Name");
      fireEvent.click(screen.getByTestId("add-columns-from-tab"));
      fireEvent.change(screen.getByTestId("add-columns-source-tab"), {
        target: { value: "scores" },
      });
      fireEvent.click(screen.getByTestId("add-columns-source-column-1"));
      fireEvent.click(screen.getByTestId("add-columns-apply"));

      expect(headerNames()).toEqual(["Name", "Score", "Age", "City"]);
    });
  });
});
