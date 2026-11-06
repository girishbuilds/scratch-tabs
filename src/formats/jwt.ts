import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule } from "./types";
import { extractJwt } from "./jwtToken";

/**
 * JSON Web Token detector. A JWT is a single line of three base64url segments
 * whose first two decode to JSON, so a match is structural rather than a guess.
 */
export class JwtFormatDetector
  extends BaseFormatDetector
  implements FormatModule
{
  id = "jwt";
  name = "JWT";
  extensions = ["jwt"];
  priority = 9;

  sampleContent(): string {
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  }

  detect(content: string): DetectionResult {
    if (!extractJwt(content)) return this.noMatch();
    return { match: true, confidence: 0.99, matchedDefinitive: true };
  }

  registerProvider(monaco: any): void {
    if (!monaco?.languages) return;
    if (monaco.languages.getLanguages().some((l: { id: string }) => l.id === "jwt")) {
      return;
    }

    monaco.languages.register({ id: "jwt" });
    monaco.languages.setMonarchTokensProvider("jwt", {
      tokenizer: {
        root: [[/[A-Za-z0-9_-]+/, "keyword.header", "@payload"]],
        payload: [
          [/\./, "delimiter"],
          [/[A-Za-z0-9_-]+/, "string.payload", "@signature"],
        ],
        signature: [
          [/\./, "delimiter"],
          [/[A-Za-z0-9_-]+/, "comment.signature", "@pop"],
        ],
      },
    });
  }
}

const jwtDetector = new JwtFormatDetector();
formatRegistry.register(jwtDetector);
