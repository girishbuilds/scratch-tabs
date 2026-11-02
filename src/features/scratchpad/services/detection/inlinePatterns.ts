import type { SecretSpan } from "../../types";
import { spansFromRegex } from "./spanUtils";

const HEADER =
  /\b(?:x-[\w-]*(?:key|token|secret|auth)[\w-]*|(?:proxy-)?authorization|api-?key)\s*:\s*(?:(?:Bearer|Basic|Token|Digest)\s+)?([^\s"'\\]{6,})/gi;
const BEARER = /\bBearer\s+([A-Za-z0-9._~+/=-]{8,})/g;
const QUERY_PARAM =
  /[?&;](?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token|token|secret|client[_-]?secret|password|passwd|pwd|key|sig|signature)=([^&\s#"']{6,})/gi;
const CLI_FLAG =
  /(?:^|\s)--?(?:password|passwd|pass|pwd|token|secret|api-?key|auth-?token|access-?token|client-?secret)(?:=|\s+)(?:"([^"]{3,})"|'([^']{3,})'|([^\s"']{3,}))/gi;

/** Secrets embedded in headers, bearer strings, query strings and CLI flags. */
export function detectInlineSecrets(text: string): SecretSpan[] {
  return [HEADER, BEARER, QUERY_PARAM, CLI_FLAG].flatMap((regex) =>
    spansFromRegex(text, regex),
  );
}
