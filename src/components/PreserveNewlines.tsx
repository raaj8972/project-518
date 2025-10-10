import React from 'react';

type Props = {
  text?: string | null;
  className?: string;
  as?: 'p' | 'div';
  highlights?: string[];
};

export default function PreserveNewlines({ text, className, as = 'p', highlights = [] }: Props) {
  if (!text) return null;

  // Normalize CRLF (Windows) line endings to LF so empty lines become empty strings
  const normalized = text.replace(/\r\n?/g, '\n');
  // Split into paragraphs at two-or-more consecutive newlines. This way
  // a blank line (or multiple blank lines) becomes a paragraph break with
  // natural paragraph margins, which visually shows gaps the user expects.
  const paragraphs = normalized.split(/\n{2,}/g);

  const content = paragraphs.map((para, idx) => {
    // Within a paragraph, preserve single newlines as <br/>
    const lines = para.split('\n');
    const lineChildren: React.ReactNode[] = [];
    lines.forEach((line, i) => {
      if (i > 0) lineChildren.push(<br key={`br-${idx}-${i}`} />);
      // If highlights provided, wrap matching words with a span
      if (highlights && highlights.length > 0) {
        // Build a regex that matches any highlight word (escaped). We'll use a
        // case-insensitive split-regex and a separate full-match regex for tests.
  // Escape highlights and wrap each with word-boundaries to avoid matching
  // inside larger words (e.g. don't match "treasure" inside "treasurer").
  const escapedList = highlights.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = escapedList.map(e => `\\b${e}\\b`).join('|');
  const splitRe = new RegExp(`(${pattern})`, 'gi');
  const parts = line.split(splitRe);
  const matchFull = new RegExp(`^(${pattern})$`, 'i');
        const fragChildren = parts.map((part, pi) => {
          if (matchFull.test(part)) {
            return (
              <span
                key={`h-${idx}-${i}-${pi}`}
                className="text-green-400 font-semibold"
                style={{ filter: 'drop-shadow(0 0 12px rgba(34,197,94,0.95)) drop-shadow(0 0 28px rgba(34,197,94,0.55))' }}
              >
                {part}
              </span>
            );
          }
          return <React.Fragment key={`t-${idx}-${i}-${pi}`}>{part}</React.Fragment>;
        });
        lineChildren.push(<React.Fragment key={`t-${idx}-${i}`}>{fragChildren}</React.Fragment>);
      } else {
        lineChildren.push(<React.Fragment key={`t-${idx}-${i}`}>{line}</React.Fragment>);
      }
    });

    // Render each paragraph as its own block so margins create visible gaps.
    return (
      <p key={`p-${idx}`} className={className} style={{ marginTop: idx === 0 ? undefined : '0.75rem' }}>
        {lineChildren}
      </p>
    );
  });

  // If user requested a div wrapper, wrap paragraphs in a div to avoid nested <p> issues
  if (as === 'div') return <div style={{ whiteSpace: 'normal' }}>{content}</div>;
  return <>{content}</>;
}
