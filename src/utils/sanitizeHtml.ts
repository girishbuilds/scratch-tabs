import DOMPurify from "dompurify";

/**
 * Sanitizers for markup that did not come from this app: inbound email,
 * pasted/shared SVG, and HTML built from user-provided text.
 *
 * Anything passed to `dangerouslySetInnerHTML` or assigned to `innerHTML` with
 * such content must go through one of these first. The app origin holds the
 * user's tabs, vault and scratch entries, so script running in it can read all
 * of them.
 */

/** Rich HTML (email bodies, generated reports). Drops scripts, handlers, javascript: URLs. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select"],
  });
}

/**
 * Untrusted SVG documents for inline preview. `foreignObject` and `script` are
 * removed, as are event-handler attributes and `javascript:` URLs.
 */
export function sanitizeSvg(svg: string): string {
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["foreignObject", "script"],
    ADD_ATTR: ["data-id"],
  });
}
