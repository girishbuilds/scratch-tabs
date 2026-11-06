import { PropertiesFormatDetector } from "../properties";

describe("PropertiesFormatDetector", () => {
  let detector: PropertiesFormatDetector;

  beforeEach(() => {
    detector = new PropertiesFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("properties");
      expect(detector.name).toBe("Properties");
      expect(detector.extensions).toEqual(["properties"]);
      expect(detector.priority).toBe(4);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("properties");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("app.name = My Application");
      expect(sample).toContain("database.host = localhost");
      expect(sample).toContain("# Java-style Properties Configuration");
      expect(sample).not.toContain("[database]"); // Should not have sections
    });
  });

  describe("Detection Logic", () => {
    test("should require more than 3 lines", () => {
      const shortContent = "key1=value1\nkey2=value2\nkey3=value3";
      const result = detector.detect(shortContent);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should detect valid properties file with dot notation", () => {
      const validProperties = `# Configuration file
app.name = My Application
app.version = 1.0.3
database.host = localhost
database.port = 5432
server.timeout = 30000`;

      const result = detector.detect(validProperties);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test("should REJECT INI file with sections", () => {
      const validIni = `# Configuration
[database]
host = localhost
port = 5432
user = db_user

[app]
name = MyApp
version = 1.0`;

      const result = detector.detect(validIni);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should reject content with only URLs", () => {
      const urlContent = `https://example.com
https://google.com
https://github.com
https://stackoverflow.com
https://mydomain.com/path/to/page`;

      const result = detector.detect(urlContent);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should reject content with mixed URLs and properties", () => {
      const mixedContent = `app.name = MyApp
https://example.com
https://google.com
key = value
https://github.com`;

      const result = detector.detect(mixedContent);
      expect(result.match).toBe(false);
    });

    test("should reject empty or very short content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
      expect(detector.detect("a").match).toBe(false);
      expect(detector.detect("ab").match).toBe(false);
    });

    test("should reject code-like content", () => {
      const codeContent = `function test() {
  const x = 5;
  return x + 1;
}
let y = test();
console.log(y);`;

      const result = detector.detect(codeContent);
      expect(result.match).toBe(false);
    });

    test("should reject SQL content", () => {
      const sqlContent = `SELECT name, email 
FROM users 
WHERE active = true
ORDER BY name
LIMIT 10
INSERT INTO logs VALUES ('test')`;

      const result = detector.detect(sqlContent);
      expect(result.match).toBe(false);
    });

    test("should reject HTML/XML content", () => {
      const htmlContent = `<html>
<head><title>Test</title></head>
<body>
<div>Content</div>
<p>More content</p>
</body>
</html>`;

      const result = detector.detect(htmlContent);
      expect(result.match).toBe(false);
    });

    test("should handle # and ! comments correctly", () => {
      const commentedProperties = `# Main configuration
! Alternative comment style
app.name = MyApp
# Database settings
database.host = localhost
! Port configuration
database.port = 5432`;

      const result = detector.detect(commentedProperties);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test("should detect high confidence for well-structured properties files", () => {
      const wellStructured = `# Application Configuration
application.name = MyApplication
application.version = 2.1.0
application.debug = false

database.host = localhost
database.port = 5432
database.username = admin
database.password = secret

logging.level = INFO
logging.file = /var/log/app.log
logging.max.size = 10MB`;

      const result = detector.detect(wellStructured);

      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
      expect(result.matchedDefinitive).toBe(true);
    });

    test("should handle edge cases with special characters", () => {
      const edgeCaseContent = `# Config with special chars
app.path = C:\\Users\\Default\\Documents
server.port = 8080
special.chars = @#$%^&*()
unicode.text = héllo wörld
numbers.only = 12345`;

      const result = detector.detect(edgeCaseContent);
      expect(result.match).toBe(true);
    });

    test("should reject properties with URLs in values", () => {
      const propertiesWithUrl = `# Config with URL
app.name = MyApp
web.url = http://localhost:8080/app
debug = true
version = 1.0`;

      const result = detector.detect(propertiesWithUrl);
      expect(result.match).toBe(false); // URLs should cause rejection
    });

    test("should reject JSON format", () => {
      const jsonContent = `{
  "app": {
    "name": "MyApplication",
    "version": "1.0.0"
  },
  "database": {
    "host": "localhost",
    "port": 5432
  }
}`;

      const result = detector.detect(jsonContent);
      expect(result.match).toBe(false);
    });

    test("should reject XML format", () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <app name="MyApp" version="1.0" />
  <database host="localhost" port="5432" />
</configuration>`;

      const result = detector.detect(xmlContent);
      expect(result.match).toBe(false);
    });

    test("should reject JavaScript format", () => {
      const jsContent = `const config = {
  app: {
    name: 'MyApp',
    version: '1.0.0'
  },
  database: {
    host: 'localhost',
    port: 5432
  }
};

module.exports = config;`;

      const result = detector.detect(jsContent);
      expect(result.match).toBe(false);
    });
  });

  describe("Monaco Provider Registration", () => {
    test("should register monaco provider without errors", () => {
      const mockMonaco = {
        languages: {
          getLanguages: jest.fn(() => []),
          register: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
          registerDocumentFormattingEditProvider: jest.fn(),
        },
        editor: {
          defineTheme: jest.fn(),
        },
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();

      expect(mockMonaco.languages.register).toHaveBeenCalledWith({ id: "properties" });
      expect(mockMonaco.languages.setMonarchTokensProvider).toHaveBeenCalled();
      expect(mockMonaco.editor.defineTheme).toHaveBeenCalled();
      expect(
        mockMonaco.languages.registerDocumentFormattingEditProvider,
      ).toHaveBeenCalled();
    });
  });

  describe("YAML-shaped content", () => {
    test("rejects a Kubernetes ConfigMap with dotted keys", () => {
      const configMap = `apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  app.name: my-app
  app.mode: production
  log.level: info
  db.host: postgres.default.svc
`;
      expect(detector.detect(configMap).match).toBe(false);
    });

    test("rejects a nested mapping", () => {
      const nested = `server:
  host: localhost
  port: 8080
  timeout: 30
`;
      expect(detector.detect(nested).match).toBe(false);
    });

    test("rejects content with list items", () => {
      const list = `name: demo
items:
- one
- two
- three
`;
      expect(detector.detect(list).match).toBe(false);
    });

    test("still accepts flat colon-delimited properties", () => {
      const flat = `app.name: my-app
app.mode: production
log.level: info
db.host: localhost
`;
      expect(detector.detect(flat).match).toBe(true);
    });
  });
});
