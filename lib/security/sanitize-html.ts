/**
 * Security module for robust HTML sanitization and text escaping.
 * Analyzes HTML according to browser-standard HTML5 parsing rules,
 * eliminating XSS injection vectors, malformed tag slash bypasses,
 * inline event handlers, and dangerous URL schemes.
 */

import { Parser as HtmlParser } from 'htmlparser2';

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
    // Relative URL without protocol or malformed
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

    // Reject dangerous declarations with expressions, scripts, bindings, or url()
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
 * Browser-native DOM parser sanitizer.
 * Parses HTML according to standard browser DOM parsing rules in an inert Document,
 * eliminating all tag/slash obfuscations and preventing script execution.
 */
function sanitizeWithBrowserDom(dirtyHtml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(dirtyHtml, 'text/html');

  // Strip script, style, and executable elements with all contents
  const dangerous = doc.querySelectorAll(
    'script, style, iframe, object, embed, svg, math, form, input, button, template, link, meta, base, noscript'
  );
  dangerous.forEach((el) => el.remove());

  // Walk all remaining elements
  const allElements = doc.body.querySelectorAll('*');
  allElements.forEach((el) => {
    const tagName = el.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      // Unwrap non-allowed tag into its children/text
      el.replaceWith(...Array.from(el.childNodes));
      return;
    }

    const allowedForTag = TAG_SPECIFIC_ATTRS[tagName];
    const attrsToRemove: string[] = [];

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      const attrName = attr.name.toLowerCase();
      const attrVal = attr.value;

      // Strip ALL on* event handlers (onerror, onload, onclick, etc.)
      if (attrName.startsWith('on')) {
        attrsToRemove.push(attr.name);
        continue;
      }

      const isAllowed =
        GLOBAL_ALLOWED_ATTRS.has(attrName) ||
        (allowedForTag && allowedForTag.has(attrName));

      if (!isAllowed) {
        attrsToRemove.push(attr.name);
        continue;
      }

      if (attrName === 'href' || attrName === 'src') {
        const safeUrl = sanitizeUrl(attrVal);
        if (!safeUrl || safeUrl === '#') {
          attrsToRemove.push(attr.name);
        } else {
          el.setAttribute(attrName, safeUrl);
        }
      } else if (attrName === 'style') {
        const cleanStyle = sanitizeInlineStyle(attrVal);
        if (cleanStyle) {
          el.setAttribute('style', cleanStyle);
        } else {
          attrsToRemove.push(attr.name);
        }
      }
    }

    attrsToRemove.forEach((name) => el.removeAttribute(name));

    if (tagName === 'a') {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });

  return doc.body.innerHTML;
}

/**
 * Server-side HTML5 parser sanitizer using htmlparser2.
 * Tokenizes according to HTML5 browser specification, handling all malformed tags,
 * slash attribute separators, and attributes without regex limitations.
 */
function sanitizeWithHtmlparser2(dirtyHtml: string): string {
  let result = '';
  let inScriptOrDangerous = 0;

  const parser = new HtmlParser(
    {
      onopentag(name, attribs) {
        const tag = name.toLowerCase();

        // Check dangerous container tags
        if (
          tag === 'script' ||
          tag === 'style' ||
          tag === 'iframe' ||
          tag === 'object' ||
          tag === 'embed' ||
          tag === 'svg' ||
          tag === 'math' ||
          tag === 'form' ||
          tag === 'template' ||
          tag === 'noscript'
        ) {
          inScriptOrDangerous++;
          return;
        }

        if (inScriptOrDangerous > 0) return;
        if (!ALLOWED_TAGS.has(tag)) return;

        const cleanAttrs: string[] = [];
        const allowedForTag = TAG_SPECIFIC_ATTRS[tag];

        for (const [rawAttr, val] of Object.entries(attribs)) {
          const attr = rawAttr.toLowerCase();

          // Reject ALL event handlers
          if (attr.startsWith('on')) continue;

          const isAllowed =
            GLOBAL_ALLOWED_ATTRS.has(attr) ||
            (allowedForTag && allowedForTag.has(attr));

          if (!isAllowed) continue;

          if (attr === 'href' || attr === 'src') {
            const safeUrl = sanitizeUrl(val);
            if (safeUrl && safeUrl !== '#') {
              cleanAttrs.push(`${attr}="${escapeHtml(safeUrl)}"`);
            }
          } else if (attr === 'style') {
            const cleanStyle = sanitizeInlineStyle(val);
            if (cleanStyle) {
              cleanAttrs.push(`style="${escapeHtml(cleanStyle)}"`);
            }
          } else if (attr === 'target' && tag === 'a') {
            cleanAttrs.push('target="_blank" rel="noopener noreferrer"');
          } else {
            cleanAttrs.push(`${attr}="${escapeHtml(val)}"`);
          }
        }

        if (tag === 'a' && !cleanAttrs.some((a) => a.startsWith('target='))) {
          cleanAttrs.push('target="_blank" rel="noopener noreferrer"');
        }

        const attrsStr = cleanAttrs.length > 0 ? ` ${cleanAttrs.join(' ')}` : '';
        const isSelfClosing = tag === 'br' || tag === 'hr' || tag === 'img';
        result += isSelfClosing ? `<${tag}${attrsStr} />` : `<${tag}${attrsStr}>`;
      },
      ontext(text) {
        if (inScriptOrDangerous > 0) return;
        result += escapeHtml(text);
      },
      onclosetag(name) {
        const tag = name.toLowerCase();

        if (
          tag === 'script' ||
          tag === 'style' ||
          tag === 'iframe' ||
          tag === 'object' ||
          tag === 'embed' ||
          tag === 'svg' ||
          tag === 'math' ||
          tag === 'form' ||
          tag === 'template' ||
          tag === 'noscript'
        ) {
          if (inScriptOrDangerous > 0) inScriptOrDangerous--;
          return;
        }

        if (inScriptOrDangerous > 0) return;

        if (ALLOWED_TAGS.has(tag) && tag !== 'br' && tag !== 'hr' && tag !== 'img') {
          result += `</${tag}>`;
        }
      },
    },
    { decodeEntities: true, lowerCaseTags: true, lowerCaseAttributeNames: true }
  );

  parser.write(dirtyHtml);
  parser.end();

  return result.trim();
}

/**
 * Main HTML Sanitizer for Email and Templates.
 * Uses browser-native DOMParser in the browser, and htmlparser2 on the server.
 */
export function sanitizeEmailHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    return sanitizeWithBrowserDom(dirtyHtml);
  }

  return sanitizeWithHtmlparser2(dirtyHtml);
}
