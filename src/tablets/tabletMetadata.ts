import { TabletActionContext, TabletAction } from "./types";
import { FileText, Type, Shield, Network, Palette, QrCode, Binary, ShieldAlert, Database, LoaderPinwheel } from "../components/Icons";
import { tabletActionService } from "../services/tabletActionService";

export interface TabletMetadata {
  id: string;
  label: string;
  keywords: string[];
  description?: string;
  // NEW: Add the optional action discovery function to the metadata.
  getActionsForContext?(context: TabletActionContext): TabletAction[];
  // NEW: Configuration for the tablet's shell behavior
  config?: {
    showStandardHeader: boolean;
  };
}

export const tabletMetadata: TabletMetadata[] = [
  {
    id: "datareconcile",
    label: "Data Reconcile",
    description: "Find matching and missing rows between two tabs, with CSV key-column matching.",
    keywords: ["compare", "reconcile", "csv", "diff", "rows"],
    getActionsForContext: (context) => {
      if (context.source !== "editor-tab" || !context.tab || context.tab.isRich || context.tab.isTablet) return [];
      return [{
        id: "datareconcile.reconcile-tab",
        label: "Reconcile data with another tab…",
        icon: Database,
        action: () => tabletActionService.handleAction({
          targetTablet: "datareconcile",
          action: "new-tab",
          payload: { sourceAId: context.tab?.id, csvMode: context.tab?.language === "csv" },
          source: { tabId: context.tab?.id, titleHint: `${context.tab?.title} (Reconcile)`, side: context.side },
        }),
      }];
    },
  },
  {
    id: "base64",
    label: "Base64",
    description: "Encode and decode text to/from Base64 format with support for URL-safe variant.",
    keywords: ["base64", "encode", "decode", "encoding", "binary"],
  },
  {
    id: "calculator",
    label: "Calculator",
    description: "A quick mathematical calculator for expressions, percentages, and conversions.",
    keywords: ["calculator", "math", "arithmetic", "compute", "calculate"],
  },
  {
    id: "clipboard",
    label: "Clipboard",
    description: "Manage your clipboard history, save frequently used snippets, and organize your text assets.",
    keywords: ["clipboard", "copy", "paste", "history", "snippets"],
  },
  {
    id: "converter",
    label: "Converter",
    description: "Multi-purpose converter for numbers (hex, dec, bin), case transformations, and more.",
    keywords: ["convert", "encode", "decode", "hash", "transform", "format"],
  },
  {
    id: "cron",
    label: "Cron Expression Builder",
    description: "Visual builder and explainer for Cron expressions with execution preview and schedule visualization.",
    keywords: [
      "cron",
      "schedule",
      "job",
      "task",
      "expression",
      "time",
      "scheduler",
      "automation",
    ],
  },
  {
    id: "tempemail",
    label: "Temp Email",
    description: "Generate temporary, disposable email addresses to receive verification codes and protect your privacy.",
    keywords: ["email", "temporary", "disposable", "mail", "inbox"],
  },
  {
    id: "ipdetails",
    label: "IP Details",
    description: "Lookup details for any IP address, including geolocation, ISP, and network information.",
    keywords: ["ip", "address", "location", "network", "geolocation"],
  },
  {
    id: "jsonmapper",
    label: "JSON Mapper",
    description: "Map and transform JSON structures using a simple, intuitive rule-based interface.",
    keywords: ["json", "mapper", "transform", "mapping", "data"],
  },
  {
    id: "jwt",
    label: "JWT",
    description: "Decode and inspect JSON Web Tokens to view headers, payloads, and verify signatures.",
    keywords: ["jwt", "token", "json web token", "authentication", "decode"],
  },
  {
    id: "openmetrics",
    label: "OpenMetrics Viewer",
    description: "Visualize and analyze OpenMetrics/Prometheus exposition data with ease.",
    keywords: [
      "metrics",
      "prometheus",
      "openmetrics",
      "monitoring",
      "prom",
      "exposition",
    ],
  },
  {
    id: "password",
    label: "Password Generator",
    description: "Generate strong, secure, and customizable passwords with entropy analysis.",
    keywords: ["password", "generator", "secure", "random", "crypto"],
  },
  {
    id: "pomodoro",
    label: "Pomodoro Timer",
    description: "A simple productivity timer based on the Pomodoro Technique with work/break sessions.",
    keywords: ["pomodoro", "timer", "productivity", "focus", "time"],
  },
  // {
  //   id: "promptmanager",
  //   label: "Prompt Manager",
  //   keywords: ["prompt", "manager", "ai", "templates", "snippets"],
  // },
  {
    id: "regex",
    label: "Regex Tester",
    description: "Test and debug regular expressions with live matching, groups, and detailed explanations.",
    keywords: [
      "regex",
      "regexp",
      "pattern",
      "match",
      "test",
      "validate",
      "expression",
    ],
  },
  {
    id: "restclient",
    label: "REST Client",
    description: "Full-featured HTTP client for testing REST APIs with support for methods, headers, and payloads.",
    keywords: ["rest", "api", "http", "client", "request", "curl"],
  },
  {
    id: "sqlsandbox",
    label: "SQL Sandbox",
    description:
      "Query local CSV, TSV, JSON, NDJSON, and Parquet files with DuckDB entirely in your browser.",
    keywords: [
      "sql",
      "duckdb",
      "database",
      "csv",
      "tsv",
      "json",
      "ndjson",
      "parquet",
      "query",
      "offline",
      "data",
    ],
  },
  {
    id: "graphql",
    label: "GraphQL Client",
    description: "Interactive GraphQL playground for exploring schemas and executing queries and mutations.",
    keywords: ["graphql", "api", "query", "mutation", "subscription", "schema"],
  },
  {
    id: "shapesnap",
    label: "Shape Snap",
    description: "Create quick sketches and diagrams using a simple, pen-based drawing interface.",
    keywords: [
      "draw",
      "diagram",
      "shapes",
      "sketch",
      "flowchart",
      "whiteboard",
    ],
  },
  {
    id: "urlparser",
    label: "URL Parser",
    description: "Deconstruct and analyze URLs into components (scheme, host, path, query params).",
    keywords: [
      "url",
      "uri",
      "parser",
      "analyzer",
      "web",
      "http",
      "https",
      "domain",
      "query",
      "fragment",
    ],
  },
  {
    id: "usergen",
    label: "User Generator",
    description: "Generate synthetic user profiles with names, emails, addresses, and bios for testing.",
    keywords: ["user", "generator", "random", "profile", "data"],
  },
  {
    id: "uuid",
    label: "UUID Generator",
    description: "Batch generate unique identifiers (v1, v4) for development and testing.",
    keywords: ["uuid", "guid", "identifier", "unique", "generate"],
  },
  {
    id: "vault",
    label: "Command Vault",
    description: "A centralized repository for your frequently used commands and scripts.",
    keywords: [
      "vault",
      "snippets",
      "knowledge base",
      "code",
      "notes",
      "commands",
    ],
  },
  {
    id: "webhookhmac",
    label: "Webhook HMAC Verifier",
    description:
      "Inspect webhook requests, validate provider HMAC signatures, and debug canonicalization issues locally.",
    keywords: [
      "webhook",
      "hmac",
      "signature",
      "stripe",
      "github",
      "slack",
      "twilio",
      "shopify",
      "svix",
      "standard webhooks",
      "verify",
      "security",
    ],
    getActionsForContext: (context) => {
      const content = context.content ?? "";
      const looksLikeWebhook =
        /x-hub-signature|stripe-signature|x-slack-signature|x-twilio-signature|x-shopify-hmac-sha256|webhook-signature/i.test(content) ||
        /^POST\s+\S+\s+HTTP\/\d(?:\.\d)?/im.test(content);

      if (!looksLikeWebhook || !context.tab) return [];

      return [
        {
          id: "webhookhmac.new-tab-from-content",
          label: "Verify Webhook Signature",
          icon: ShieldAlert,
          action: () => {
            if (!context.tab) return;
            tabletActionService.handleAction({
              targetTablet: "webhookhmac",
              action: "new-tab",
              payload: {
                inputMode: "raw-http",
                bodyText: content,
                headersText: "",
              },
              source: {
                tabId: context.tab.id,
                titleHint: `${context.tab.title} (Webhook HMAC)`,
                side: context.side,
              },
            });
          },
        },
      ];
    },
  },
  {
    id: "wordcount",
    label: "Word Count",
    description: "Detailed text analysis with word/character counts, readability scores, and keyword density.",
    keywords: [
      "word",
      "count",
      "text",
      "analysis",
      "statistics",
      "readability",
      "writing",
      "seo",
      "keywords",
      "density",
      "flesch",
      "kincaid",
      "syllables",
      "sentences",
      "paragraphs",
      "characters",
    ],
    // NEW: Implement the action discovery logic for Word Count here.
    // This function is lightweight and has no heavy dependencies.
    getActionsForContext: (context) => {
      const actions: TabletAction[] = [];
      if (context.source === 'editor-tab' && context.tab && context.content && context.content.length > 50) {
        actions.push({
          id: 'wordcount.new-tab-from-content',
          label: 'Open in Word Count',
          icon: FileText,
          action: () => {
            if (!context.tab) return;
            tabletActionService.handleAction({
              targetTablet: 'wordcount',
              action: 'new-tab',
              payload: {
                content: context.content || '',
                title: context.tab.title,
              },
              source: {
                tabId: context.tab.id,
                titleHint: `${context.tab.title} (Analysis)`,
                side: context.side,
              }
            });
          }
        });
      }
      return actions;
    },
  },
  {
    id: "emoji",
    label: "Emoji as Data",
    description: "Search and discover emojis with their Unicode, HTML, and Hex representations.",
    keywords: ["emoji", "unicode", "symbols", "formatter", "picker", "data", "encoding"],
  },
  {
    id: "loremipsum",
    label: "Lorem Ipsum Generator",
    description: "Generate high-quality placeholder text (paragraphs, sentences, words) for your designs and mockups.",
    keywords: ["lorem", "ipsum", "placeholder", "text", "mock", "data", "generator"],
    getActionsForContext: (context) => {
      // Always available from any context
      return [
        {
          id: 'generate-content',
          label: 'Generate Mock Content',
          icon: Type,
          showInEditorMenu: false,
          action: () => {
            tabletActionService.handleAction({
              targetTablet: 'loremipsum',
              action: 'new-tab',
              payload: {},
              source: {
                titleHint: 'Lorem Ipsum Generator',
                side: context.side
              },
            });
          },
        },
      ];
    },
  },
  {
    id: "checksum",
    label: "Checksum",
    description: "Calculate and verify file/text integrity using MD5, SHA-1, SHA-256, and CRC32 hashes.",
    keywords: ["checksum", "hash", "md5", "sha", "crc32", "verify", "integrity"],
    getActionsForContext: (context) => {
      const actions = [];

      // Always available
      actions.push({
        id: 'calculate-checksum',
        label: 'Calculate Checksum',
        icon: Shield,
        action: () => {
          tabletActionService.handleAction({
            targetTablet: 'checksum',
            action: 'new-tab',
            payload: context.content ? { text: context.content } : {},
            source: {
              titleHint: 'Checksum',
              side: context.side
            },
          });
        },
      });

      return actions;
    },
  },
  {
    id: "datetime",
    label: "Date & Time",
    description: "Comprehensive date and time toolkit with timestamp conversion, timezone tracking, and duration math.",
    keywords: ["date", "time", "timestamp", "timezone", "convert", "parse", "duration", "calculator"],
  },
  {
    id: "diagram",
    label: "Diagram Editor",
    description: "Interactive Mermaid diagram editor with live preview and optimization",
    keywords: ["diagram", "mermaid", "flowchart", "sequence", "gantt", "chart", "graph", "visualization"],
    getActionsForContext: (context) => {
      if (context.source === 'editor-tab' && context.content) {
        // Check if content looks like Mermaid diagram code
        const mermaidPatterns = [
          /flowchart\s+(TD|LR|BT|RL)/i,
          /graph\s+(TD|LR|BT|RL)/i,
          /sequenceDiagram/i,
          /gantt/i,
          /classDiagram/i,
          /stateDiagram/i,
          /erDiagram/i,
          /journey/i,
          /gitgraph/i,
          /pie\s+title/i,
          /mindmap/i,
          /timeline/i
        ];

        const isMermaidCode = mermaidPatterns.some(pattern => pattern.test(context.content || ''));

        if (isMermaidCode) {
          return [{
            id: 'open-diagram-editor',
            label: 'Open in Diagram Editor',
            icon: Network,
            action: () => {
              tabletActionService.handleAction({
                targetTablet: 'diagram',
                action: 'new-tab',
                payload: { mermaidCode: context.content || '' },
                source: {
                  tabId: context.tab?.id,
                  titleHint: 'Diagram Editor',
                  side: context.side
                }
              });
            }
          }];
        }
      }
      return [];
    }
  },
  {
    id: 'qrcode',
    label: 'QR Code Generator',
    description:
      'Generate and decode QR codes entirely in your browser. Supports URLs, WiFi credentials, contacts, and more — no data leaves your device.',
    keywords: ['qr', 'qrcode', 'generator', 'barcode', 'wifi', 'url', 'vcard', 'offline', 'decode', 'scan'],
    getActionsForContext: (context) => {
      if (context.source === 'editor-tab' && context.content) {
        const isUrl = /^https?:\/\//i.test(context.content.trim());
        if (isUrl) {
          return [
            {
              id: 'qrcode.generate-from-url',
              label: 'Generate QR Code',
              icon: QrCode,
              action: () => {
                tabletActionService.handleAction({
                  targetTablet: 'qrcode',
                  action: 'new-tab',
                  payload: { url: context.content?.trim() },
                  source: { tabId: context.tab?.id, titleHint: 'QR Code', side: context.side },
                });
              },
            },
          ];
        }
      }
      return [];
    },
  },
  {
    id: 'spinthewheel',
    label: 'Spin the Wheel',
    description:
      'Colourful spinning wheel for random picks, raffles, and decisions — with history, snapshots, sharing, and confetti.',
    keywords: [
      'wheel', 'spin', 'random', 'picker', 'names', 'raffle',
      'roulette', 'lottery', 'prize', 'decision',
    ],
    getActionsForContext: (context) => {
      if (context.source !== 'editor-tab' || !context.tab || !context.content?.trim()) {
        return [];
      }

      return [
        {
          id: 'spinthewheel.new-tab-from-content',
          label: 'Spin the wheel',
          icon: LoaderPinwheel,
          action: () => {
            if (!context.tab) return;
            tabletActionService.handleAction({
              targetTablet: 'spinthewheel',
              action: 'new-tab',
              payload: {
                content: context.content || '',
                title: context.tab.title,
              },
              source: {
                tabId: context.tab.id,
                titleHint: `${context.tab.title} (Wheel)`,
                side: context.side,
              },
            });
          },
        },
      ];
    },
  },
  {
    id: 'sshkeygen',
    label: 'SSH Key Generator',
    description:
      'Generate Ed25519, RSA, and ECDSA SSH key pairs with optional passphrase encryption. ' +
      'Inspect any public or private key to view fingerprints, derive a public key from a private key, ' +
      'or validate that a key pair matches — entirely offline.',
    keywords: [
      'ssh', 'keygen', 'key', 'rsa', 'ed25519', 'ecdsa',
      'fingerprint', 'public key', 'private key', 'authorized_keys',
      'passphrase', 'generate', 'security', 'cryptography', 'openssh',
    ],
  },
  {
    id: "secretscanner",
    label: "Secret Scanner",
    description: "Scan text, diffs, logs, configs, and credentials for secrets entirely offline.",
    keywords: [
      "secret",
      "scanner",
      "security",
      "token",
      "credential",
      "api key",
      "private key",
      "redact",
      "offline",
    ],
    getActionsForContext: (context) => {
      if (context.source !== "editor-tab" || !context.content?.trim()) {
        return [];
      }

      return [
        {
          id: "secretscanner.scan",
          label: "Scan for Secrets",
          icon: ShieldAlert,
          action: () => {
            tabletActionService.handleAction({
              targetTablet: "secretscanner",
              action: "new-tab",
              payload: {
                content: context.content || "",
                title: context.tab?.title,
              },
              source: {
                tabId: context.tab?.id,
                titleHint: "Secret Scanner",
                side: context.side,
              },
            });
          },
        },
      ];
    },
  },
  {
    id: 'totp',
    label: 'TOTP 2FA Generator',
    description:
      'Generate and verify time-based one-time passwords for two-factor authentication. ' +
      'Supports multiple accounts, SHA1/256/512, and otpauth:// URI import — entirely offline.',
    keywords: [
      'totp', '2fa', 'otp', 'authenticator', 'two-factor', 'mfa',
      'one-time', 'password', 'rfc6238', 'google authenticator',
    ],
  },
  {
    id: 'colourpalette',
    label: 'Colour Palette',
    description: 'Extract, create, and test colour palettes with accessibility insights',
    keywords: ['colour', 'palette', 'design', 'accessibility', 'contrast', 'css', 'extract'],
    getActionsForContext: (context) => {
      if (context.source === 'editor-tab' && context.content) {
        // Check if content contains color values
        const hasColors = /(?:#[a-fA-F0-9]{3,6}|rgb\(|hsl\(|color:)/i.test(context.content || '');
        if (hasColors) {
          return [
            {
              id: 'extract-colors-from-css',
              label: 'Extract Colours to Palette',
              icon: Palette,
              action: () => {
                // Extract colors from CSS/code and open colour palette
                tabletActionService.handleAction({
                  targetTablet: 'colourpalette',
                  action: 'new-tab',
                  payload: { extractFromText: context.content || '' },
                  source: {
                    tabId: context.tab?.id,
                    titleHint: 'Colour Palette',
                    side: context.side
                  },
                });
              },
            },
          ];
        }
      }
      return [];
    },
  },
  {
    id: "hexviewer",
    label: "Hex Viewer / Binary Inspector",
    description: "A professional, premium offline hex viewer, binary inspector, and byte editor with data decoding, Shannon entropy analysis, and byte distribution stats.",
    keywords: ["hex", "binary", "base64", "inspector", "editor", "bytes", "entropy", "raw", "octal", "viewer"],
    getActionsForContext: (context) => {
      if (context.source === "editor-tab" && context.content && context.content.length > 0) {
        return [
          {
            id: "hexviewer.inspect",
            label: "Open in Hex Viewer",
            icon: Binary,
            action: () => {
              tabletActionService.handleAction({
                targetTablet: "hexviewer",
                action: "new-tab",
                payload: {
                  content: context.content || "",
                  title: context.tab?.title,
                },
                source: {
                  tabId: context.tab?.id,
                  titleHint: "Hex Viewer",
                  side: context.side,
                },
              });
            },
          },
        ];
      }
      return [];
    },
  },
  {
    id: "archive-inspector",
    label: "Archive Inspector",
    description: "Inspect ZIP, JAR, APK, DOCX, EPUB and all ZIP-format archives offline.",
    keywords: ["zip", "jar", "apk", "docx", "epub", "archive", "unzip", "inspect"],
  },
];
