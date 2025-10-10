import React from 'react';
import PreserveNewlines from './PreserveNewlines';

type HeaderHighlightRule = {
  // A string or RegExp to match within the header line; case-insensitive recommended
  pattern: string | RegExp;
  // CSS classes to apply to the matched text span
  className: string;
};

type Props = {
  text?: string | null;
  headerClassName?: string;
  bodyClassName?: string;
  highlights?: string[];
  // Optional: custom highlight rules applied only to the header (first non-empty line)
  headerHighlightRules?: HeaderHighlightRule[];
};

export default function DescriptionHeaderBody({ text, headerClassName = 'text-lg font-semibold mb-2', bodyClassName = 'text-gray-300 mb-4 leading-relaxed text-sm', highlights = [], headerHighlightRules = [] }: Props) {
  if (!text) return null;

  const normalized = String(text).replace(/\r\n?/g, '\n').trim();

  // Find first non-empty line as header, rest is body
  const lines = normalized.split('\n');
  let header = '';
  let bodyLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i].trim();
    if (header === '' && ln !== '') {
      header = ln;
      bodyLines = lines.slice(i + 1);
      break;
    }
  }

  if (!header) {
    return <PreserveNewlines text={normalized} className={bodyClassName} highlights={highlights} />;
  }

  // Strip surrounding quotes from header
  header = header.replace(/^\s*["'“”]+|["'“”]+\s*$/g, '').trim();

  const bodyRaw = bodyLines.join('\n').trim();
  const paragraphs = bodyRaw.length > 0 ? bodyRaw.split(/\n{2,}/).map(p => p.trim()).filter(Boolean) : [];

  // Helper to render header with optional custom highlight rules
  function renderHeaderWithRules(h: string) {
    // If no header rules, fall back to PreserveNewlines so default green highlights work
    if (!headerHighlightRules || headerHighlightRules.length === 0) {
      return <PreserveNewlines as="div" text={h} className={headerClassName} highlights={highlights} />;
    }

    // Build combined regex of rules in a way we can identify which rule matched.
    // We'll wrap each rule source in a capturing group; RegExp flags: i (case-insensitive) and g (global)
    const sources: string[] = headerHighlightRules.map(r => {
      if (r.pattern instanceof RegExp) {
        // Strip leading and trailing slashes and flags, use the source only
        return `(${r.pattern.source})`;
      }
      // Escape string patterns for safe regex use
      const escaped = r.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return `(${escaped})`;
    });

    const combined = new RegExp(sources.join('|'), 'gi');

    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = combined.exec(h)) !== null) {
      const matchStart = match.index;
      const matchText = match[0];
      // Push preceding plain text
      if (matchStart > lastIndex) {
        nodes.push(<React.Fragment key={`t-${lastIndex}`}>{h.slice(lastIndex, matchStart)}</React.Fragment>);
      }
      // Determine which capturing group matched (1-based)
      let ruleIdx = -1;
      for (let gi = 1; gi < match.length; gi++) {
        if (typeof match[gi] !== 'undefined') { ruleIdx = gi - 1; break; }
      }
      const rule = headerHighlightRules[ruleIdx];
      nodes.push(
        <span key={`h-${matchStart}`} className={rule?.className || ''}>{matchText}</span>
      );
      lastIndex = matchStart + matchText.length;
    }
    // Push remainder
    if (lastIndex < h.length) {
      nodes.push(<React.Fragment key={`t-${lastIndex}`}>{h.slice(lastIndex)}</React.Fragment>);
    }

    return <div className={headerClassName}>{nodes}</div>;
  }

  return (
    <div>
      {/* Render header with optional header-highlight rules (only affects the first line) */}
      {renderHeaderWithRules(header)}
      {paragraphs.length > 0 ? (
  paragraphs.map((p, i) => <PreserveNewlines key={i} text={p} className={bodyClassName} highlights={highlights} />)
      ) : (
        // If no explicit paragraphs but bodyRaw is empty, attempt a sentence-split fallback
  (bodyRaw && <PreserveNewlines text={bodyRaw} className={bodyClassName} highlights={highlights} />) || (
          // sentence-split when author typed a single paragraph without newlines
          (() => {
            const s = header;
            const match = s.match(/([\s\S]*?[\.\!\?])\s+([\s\S]+)/);
            if (match) {
              const h = match[1].trim().replace(/^\s*["'“”]+|["'“”]+\s*$/g, '');
              const rest = match[2].trim();
              return (
                <>
                  <div className={headerClassName}>{h}</div>
                  <PreserveNewlines text={rest} className={bodyClassName} highlights={highlights} />
                </>
              );
            }
            return null;
          })()
        )
      )}
    </div>
  );
}
