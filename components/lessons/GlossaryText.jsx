import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GLOSSARY } from './glossary';

// Sort terms by length (longest first) so multi-word phrases match before their component words
const sortedTerms = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);

// Escape special regex characters in each term
const escapedTerms = sortedTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

// Build a single regex that matches any glossary term (case-insensitive, word boundaries)
const pattern = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');

function renderTextWithTooltips(text) {
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  pattern.lastIndex = 0;
  while ((match = pattern.exec(text)) !== null) {
    const matchedText = match[0];
    const glossaryKey = sortedTerms.find(t => t.toLowerCase() === matchedText.toLowerCase());

    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    parts.push(
      <Tooltip key={`glossary-${key++}`}>
        <TooltipTrigger asChild>
          <span
            className="underline decoration-dotted decoration-blue-400 underline-offset-2 cursor-help text-blue-700 hover:text-blue-900"
            tabIndex={0}
          >
            {matchedText}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-sm font-normal leading-relaxed">
          {GLOSSARY[glossaryKey]}
        </TooltipContent>
      </Tooltip>
    );

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * Wraps any glossary terms found in the children text with hover tooltips.
 * Handles strings, arrays of strings/elements (e.g. from ReactMarkdown), and passes through non-string nodes.
 */
export default function GlossaryText({ children }) {
  if (!children) return children;

  // Plain string
  if (typeof children === 'string') {
    return <TooltipProvider delayDuration={200}>{renderTextWithTooltips(children)}</TooltipProvider>;
  }

  // Array of nodes (common from ReactMarkdown) — process only the string items
  if (Array.isArray(children)) {
    const hasStrings = children.some(c => typeof c === 'string');
    if (!hasStrings) return children;
    return (
      <TooltipProvider delayDuration={200}>
        {React.Children.map(children, (child, i) =>
          typeof child === 'string'
            ? <React.Fragment key={i}>{renderTextWithTooltips(child)}</React.Fragment>
            : child
        )}
      </TooltipProvider>
    );
  }

  // Any other React node — pass through unchanged
  return children;
}