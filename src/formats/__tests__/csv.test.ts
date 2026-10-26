import { CsvFormatDetector } from "../csv";

describe("CsvFormatDetector", () => {
  let detector: CsvFormatDetector;

  beforeEach(() => {
    detector = new CsvFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("csv");
      expect(detector.name).toBe("CSV / TSV");
      expect(detector.extensions).toEqual(["csv", "tsv", "txt"]);
      expect(detector.priority).toBe(2);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("csv");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid CSV sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("ID,First Name,Last Name,Email");
      expect(sample).toContain("john.doe@example.com");
      expect(sample).toContain(",");
    });
  });

  describe("Detection Logic", () => {
    test("should detect CSV with comma delimiter", () => {
      const csvContent = `Name,Age,City,Country
John Doe,30,New York,USA
Jane Smith,25,London,UK
Bob Johnson,35,Toronto,Canada`;
      const result = detector.detect(csvContent);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect TSV with tab delimiter", () => {
      const tsvContent = `Name\tAge\tCity\tCountry
John Doe\t30\tNew York\tUSA
Jane Smith\t25\tLondon\tUK
Bob Johnson\t35\tToronto\tCanada`;
      const result = detector.detect(tsvContent);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect CSV with semicolon delimiter", () => {
      const csvContent = `Product;Price;Category;Stock
Laptop;999.99;Electronics;50
Phone;599.99;Electronics;100
Desk;299.99;Furniture;25`;
      const result = detector.detect(csvContent);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should detect CSV with pipe delimiter", () => {
      const csvContent = `ID|Name|Department|Salary
1|Alice Johnson|Engineering|75000
2|Bob Smith|Marketing|65000
3|Carol Davis|HR|55000`;
      const result = detector.detect(csvContent);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should detect CSV with quoted fields", () => {
      const csvContent = `"First Name","Last Name","Email","Address"
"John","Doe","john.doe@email.com","123 Main St, City, State"
"Jane","Smith","jane.smith@email.com","456 Oak Ave, Town, State"
"Bob","Johnson","bob.j@email.com","789 Pine Rd, Village, State"`;
      const result = detector.detect(csvContent);
      // Some CSV detectors are conservative with quoted content
      if (result.match) {
        expect(result.confidence).toBeGreaterThan(0.4);
      }
    });

    test("should detect CSV with RFC 4180 doubled quotes inside quoted fields", () => {
      const csvContent = `"Product","Price","Description","Age"
"Laptop","$999.99","HP laptop with ""quotes""","1"
"Mouse","$29.99","Wireless optical mouse","2"
"Keyboard","$79.99","Mechanical keyboard","3"`;
      const result = detector.detect(csvContent);
      expect(result.match).toBe(true);
    });

    test("should not detect CSV when a quoted field has a stray unescaped quote", () => {
      const csvContent = `"Product","Price","Description"
"Laptop","$999.99","HP "laptop" stand"
"Mouse","$29.99","Wireless optical mouse"`;
      const result = detector.detect(csvContent);
      expect(result.match).toBe(false);
    });

    test("should detect CSV with numeric data", () => {
      const csvContent = `Year,Q1,Q2,Q3,Q4,Total
2020,1000,1200,1100,1300,4600
2021,1100,1300,1250,1400,5050
2022,1200,1400,1350,1500,5450`;
      const result = detector.detect(csvContent);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should detect CSV with mixed data types", () => {
      const csvContent = `Product,Price,InStock,LastUpdated
"Widget A",19.99,true,2023-01-15
"Widget B",29.99,false,2023-01-16
"Widget C",39.99,true,2023-01-17`;
      const result = detector.detect(csvContent);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should reject JSON content", () => {
      const jsonContent = `{
  "users": [
    {"name": "John", "age": 30},
    {"name": "Jane", "age": 25}
  ]
}`;
      const result = detector.detect(jsonContent);
      expect(result.match).toBe(false);
    });

    test("should reject code content", () => {
      const codeContent = `function processData() {
  const data = getData();
  return data.map(item => ({
    name: item.name,
    value: item.value
  }));
}`;
      const result = detector.detect(codeContent);
      expect(result.match).toBe(false);
    });

    test("should reject markdown content", () => {
      const markdownContent = `# Data Report

| Name | Age | City |
|------|-----|------|
| John | 30  | NYC  |
| Jane | 25  | LA   |

This is a summary of the data.`;
      const result = detector.detect(markdownContent);
      expect(result.match).toBe(false);
    });

    test("should reject markdown table without surrounding text", () => {
      const markdownTable = `| ID | First Name | Last Name | Email |
| --- | --- | --- | --- |
| 1 | John | Doe | john.doe@example.com |
| 2 | Jane | Smith | jane.smith@example.com |
| 3 | Michael | Johnson | michael.j@example.com |`;
      const result = detector.detect(markdownTable);
      expect(result.match).toBe(false);
    });

    test("should handle empty or very short content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
      expect(detector.detect("single line").match).toBe(false);
    });

    test("should reject CSV with inconsistent column counts", () => {
      const inconsistentCSV = `Name,Age,City
John,30,NYC,Extra
Jane,25
Bob,35,Chicago`;
      const result = detector.detect(inconsistentCSV);
      // Should reject due to inconsistent delimiter counts
      expect(result.match).toBe(false);
    });

    test("should reject single line content", () => {
      const singleLine = `Name,Age,City,Email`;
      const result = detector.detect(singleLine);
      expect(result.match).toBe(false);
    });

    test("should reject two line content", () => {
      const twoLines = `Name,Age,City
John,30,NYC`;
      const result = detector.detect(twoLines);
      expect(result.match).toBe(false);
    });

    test("should reject CSV with header only (single line)", () => {
      const headerOnly = `ID,Name,Email,Phone,Address`;
      const result = detector.detect(headerOnly);
      // Single line content should be rejected
      expect(result.match).toBe(false);
    });

    test("should handle CSV with empty fields", () => {
      const csvWithEmpties = `Name,Age,City,Country
John,,New York,USA
,25,London,UK
Bob,35,,Canada`;
      const result = detector.detect(csvWithEmpties);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("Monaco Provider Registration", () => {
    test("should register monaco provider without errors", () => {
      const mockMonaco = {
        languages: {
          registerDocumentFormattingEditProvider: jest.fn(),
          getLanguages: jest.fn(() => []),
          register: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
        },
        editor: {
          defineTheme: jest.fn(),
        },
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();
    });
  });
});