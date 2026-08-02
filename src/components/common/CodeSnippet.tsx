'use client';

import { useMemo } from 'react';

/**
 * Syntax-highlighted view of the tracking snippet.
 *
 * A plain monospace string is hard to read back: the whole point of showing
 * the snippet is that someone can check the site id and the src by eye before
 * pasting it. Colouring the parts makes the two things worth checking stand
 * out. Deliberately not a full highlighter library, since the input is one
 * HTML tag we generate ourselves.
 */

// Palette tuned for the near-black snippet panels. Attributes take the brand
// violet, values a mint that reads clearly against it, and punctuation stays
// quiet so the shape of the tag does not compete with its contents.
const COLOR = {
  punct: '#6b7280',
  tag: '#ff8fa9',
  attr: '#b9b5f0',
  value: '#7ee7b0',
  plain: '#d4d4d8',
};

type Token = { text: string; color: string };

const PATTERN = /("[^"]*"|'[^']*'|<\/?|\/?>|=|[A-Za-z][\w:.-]*|\s+|.)/g;

function tokenize(code: string): Token[] {
  const out: Token[] = [];
  // The word straight after an opening bracket is the element name; every
  // other bare word inside the tag is an attribute.
  let expectTagName = false;

  for (const [raw] of code.matchAll(PATTERN)) {
    if (raw === '<' || raw === '</') {
      expectTagName = true;
      out.push({ text: raw, color: COLOR.punct });
    } else if (raw === '>' || raw === '/>' || raw === '=') {
      expectTagName = false;
      out.push({ text: raw, color: COLOR.punct });
    } else if (/^["']/.test(raw)) {
      out.push({ text: raw, color: COLOR.value });
    } else if (/^\s+$/.test(raw)) {
      out.push({ text: raw, color: COLOR.plain });
    } else if (/^[A-Za-z]/.test(raw)) {
      out.push({ text: raw, color: expectTagName ? COLOR.tag : COLOR.attr });
      expectTagName = false;
    } else {
      out.push({ text: raw, color: COLOR.plain });
    }
  }
  return out;
}

export function CodeSnippet({ code, className = '' }: { code: string; className?: string }) {
  const tokens = useMemo(() => tokenize(code), [code]);

  return (
    // Wraps rather than scrolls: a snippet clipped at the right edge looks
    // broken and hides the part people need to check.
    <pre
      className={`whitespace-pre-wrap break-all font-mono leading-relaxed ${className}`}
      style={{ color: COLOR.plain }}
    >
      <code>
        {tokens.map((t, i) => (
          <span key={i} style={{ color: t.color }}>
            {t.text}
          </span>
        ))}
      </code>
    </pre>
  );
}
