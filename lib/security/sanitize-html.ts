/**
 * Security module for robust HTML sanitization and text escaping.
 * Protects against XSS (Cross-Site Scripting) in imported emails,
 * visual editors, and preview renders.
 * 
 * Complies with OWASP recommendations and email-safe HTML standards.
 */

// Permitted HTML tags for email layout and formatting
const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'span', 'div',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'blockquote', 'hr', 'pre', 'code',
  'img',
]);

// Permitted attributes by tag or globally
const GLOBAL_ALLOWED_ATTRS = new Set([
  'class', 'id', 'title', 'dir', 'lang', 'style',
]);

const TAG_SPECIFIC_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'align', 'border']),
  table: new Set(['width', 'cellpadding', 'cellspacing', 'border', 'align', 'bgcolor']),
  td: new Set(['width', 'height', 'align', 'valign', 'colspan', 'rowspan', 'bgcolor']),
  th: new Set(['width', 'height', 'align', 'valign', 'colspan', 'rowspan', 'bgcolor']),
  tr: new Set(['align', 'valign', 'bgcolor']),
  div: new Set(['align']),
  p: new Set(['align']),
};

// Safe protocols for URLs
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/**
 * Escapes special HTML characters in plain text to prevent injection.
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates and sanitizes a URL string.
 * Disallows javascript:, data:, vbscript: and malformed URIs.
 */
export function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();

  // Allow relative URLs starting with / or #
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (SAFE_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
      return trimmed;
    }
  } catch {
    // Relative URL or invalid scheme
    if (!trimmed.includes(':')) {
      return trimmed;
    }
  }

  // Dangerous or invalid protocol -> defang to safe anchor
  return '#';
}

/**
 * Sanitizes CSS style strings by stripping dangerous expressions, url(), and bindings.
 */
export function sanitizeInlineStyle(rawStyle: string): string {
  if (!rawStyle) return '';

  // Remove CSS comments
  const cleaned = rawStyle.replace(/\/\*[\s\S]*?\*\//g, '');

  // Filter declarations to safe properties
  const declarations = cleaned.split(';');
  const safeDeclarations: string[] = [];

  const SAFE_STYLE_PROPS = new Set([
    'color', 'background', 'background-color',
    'font', 'font-family', 'font-size', 'font-weight', 'font-style',
    'text-align', 'text-decoration', 'text-transform', 'line-height', 'letter-spacing',
    'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
    'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
    'border', 'border-top', 'border-bottom', 'border-left', 'border-right',
    'border-radius', 'border-collapse', 'border-color', 'border-width', 'border-style',
    'width', 'max-width', 'min-width',
    'height', 'max-height', 'min-height',
    'display', 'vertical-align',
  ]);

  for (const decl of declarations) {
    const trimmed = decl.trim();
    if (!trimmed) continue;

    // Reject dangerous declarations with expressions, scripts, or bindings
    if (
      /expression\s*\(/i.test(trimmed) ||
      /behavior\s*:/i.test(trimmed) ||
      /javascript\s*:/i.test(trimmed) ||
      /@import/i.test(trimmed) ||
      /-moz-binding/i.test(trimmed) ||
      /url\s*\(/i.test(trimmed)
    ) {
      continue;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const prop = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const val = trimmed.slice(colonIdx + 1).trim();

    if (SAFE_STYLE_PROPS.has(prop)) {
      safeDeclarations.push(`${prop}: ${val}`);
    }
  }

  return safeDeclarations.join('; ');
}

/**
 * Main HTML Sanitizer for Email and Templates.
 * Strips all script tags, style blocks, inline event handlers, and dangerous attributes.
 * Preserves standard email typography, tables, links, and merge placeholders (e.g. {{azienda}}).
 */
export function sanitizeEmailHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  // 1. Strip script tags with all contents
  let html = dirtyHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // 2. Strip style tags with all contents
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // 3. Strip iframe, object, embed, svg, math, form, input, button tags with contents
  html = html.replace(/<(iframe|object|embed|svg|math|form|template)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
  html = html.replace(/<\/?(iframe|object|embed|svg|math|form|input|button|template|link|meta|base)\b[^>]*>/gi, '');

  // 4. Strip HTML comments (which can be used for IE conditional comments bypasses)
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // 5. Parse and sanitize all remaining tags and attributes
  const tagRegex = /<\/?([a-zA-Z0-9]+)((?:\s+[^>]*?)?)\s*(\/?)>/g;

  html = html.replace(tagRegex, (_fullMatch, rawTagName, rawAttrs, closingSlash) => {
    const tagName = rawTagName.toLowerCase();

    // If tag is not in allowlist, strip the tag completely
    if (!ALLOWED_TAGS.has(tagName)) {
      return '';
    }

    const isSelfClosing = closingSlash === '/' || tagName === 'br' || tagName === 'hr' || tagName === 'img';
    if (_fullMatch.startsWith('</')) {
      return `</${tagName}>`;
    }

    // Process attributes
    const cleanAttrs: string[] = [];
    const attrRegex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let attrMatch: RegExpExecArray | null;

    const allowedForTag = TAG_SPECIFIC_ATTRS[tagName];

    while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

      // BLOCK ALL inline event handlers (onerror, onload, onclick, on*, etc.)
      if (attrName.startsWith('on')) {
        continue;
      }

      // Check if attribute is permitted
      const isAllowed =
        GLOBAL_ALLOWED_ATTRS.has(attrName) ||
        (allowedForTag && allowedForTag.has(attrName));

      if (!isAllowed) {
        continue;
      }

      // Specific validation for URL attributes
      if (attrName === 'href' || attrName === 'src') {
        const cleanUrl = sanitizeUrl(attrValue);
        cleanAttrs.push(`${attrName}="${escapeHtml(cleanUrl)}"`);
      } else if (attrName === 'style') {
        const cleanStyle = sanitizeInlineStyle(attrValue);
        if (cleanStyle) {
          cleanAttrs.push(`style="${escapeHtml(cleanStyle)}"`);
        }
      } else if (attrName === 'target' && tagName === 'a') {
        // Enforce safe target on links
        cleanAttrs.push('target="_blank"');
        cleanAttrs.push('rel="noopener noreferrer"');
      } else {
        cleanAttrs.push(`${attrName}="${escapeHtml(attrValue)}"`);
      }
    }

    // For <a> tags without target, add safe rel if href present
    if (tagName === 'a' && !cleanAttrs.some((a) => a.startsWith('target='))) {
      cleanAttrs.push('target="_blank" rel="noopener noreferrer"');
    }

    const attrsString = cleanAttrs.length > 0 ? ` ${cleanAttrs.join(' ')}` : '';
    return isSelfClosing ? `<${tagName}${attrsString} />` : `<${tagName}${attrsString}>`;
  });

  return html.trim();
}
