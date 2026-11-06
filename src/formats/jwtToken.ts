/**
 * Pure helpers for recognising a JSON Web Token (JWS compact serialisation)
 * in free text. Shared by the JWT format detector and the editor context menu
 * so both agree on what "the content is a JWT" means.
 */

const COMPACT_JWS = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/;

// "Authorization: Bearer <token>" or "Bearer <token>"
const BEARER_PREFIX = /^(?:authorization\s*:\s*)?bearer\s+/i;

const decodeSegment = (segment: string): unknown => {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return JSON.parse(atob(padded));
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Returns the token when the whole content is a single JWT, optionally
 * prefixed with `Bearer ` or `Authorization: Bearer ` and optionally wrapped
 * in matching quotes. Returns null for anything else.
 *
 * The header must decode to a JSON object with an `alg` and the payload to a
 * JSON object, so dotted identifiers such as version strings or hostnames
 * that merely look like three base64url segments are not mistaken for tokens.
 */
export const extractJwt = (content: string): string | null => {
  let candidate = content.trim();
  if (!candidate) return null;

  candidate = candidate.replace(BEARER_PREFIX, "");
  const quoted = candidate.match(/^(["'`])(.*)\1$/s);
  if (quoted) candidate = quoted[2].trim();

  if (!COMPACT_JWS.test(candidate)) return null;

  const [header, payload] = candidate.split(".");
  try {
    const decodedHeader = decodeSegment(header);
    const decodedPayload = decodeSegment(payload);
    if (!isPlainObject(decodedHeader) || typeof decodedHeader.alg !== "string") {
      return null;
    }
    if (!isPlainObject(decodedPayload)) return null;
  } catch {
    return null;
  }

  return candidate;
};
