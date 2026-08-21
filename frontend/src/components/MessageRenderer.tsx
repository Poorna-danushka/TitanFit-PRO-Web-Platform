/**
 * MessageRenderer — lightweight markdown renderer for chat bubbles.
 * Handles: headings, bold, italic, inline-code, code blocks,
 *          numbered lists, bullet lists, dividers, and paragraphs.
 */

import React from 'react';

/* ─── Inline parser ──────────────────────────────────────────── */
function parseInline(text: string): React.ReactNode[] {
  // Patterns: **bold**, *italic*, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i} className="italic text-gray-300">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-white/10 text-green-300 font-mono text-[0.75em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/* ─── Block types ────────────────────────────────────────────── */
type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'bullet'; items: string[] }
  | { type: 'numbered'; items: string[] }
  | { type: 'code'; text: string }
  | { type: 'divider' }
  | { type: 'paragraph'; text: string };

function parseBlocks(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip blank lines (they just separate blocks)
    if (!trimmed) { i++; continue; }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ type: 'code', text: codeLines.join('\n') });
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push({ type: 'divider' });
      i++;
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) { blocks.push({ type: 'h3', text: trimmed.slice(4) }); i++; continue; }
    if (trimmed.startsWith('## '))  { blocks.push({ type: 'h2', text: trimmed.slice(3) }); i++; continue; }
    if (trimmed.startsWith('# '))   { blocks.push({ type: 'h1', text: trimmed.slice(2) }); i++; continue; }

    // Bullet list — collect consecutive bullet lines
    if (/^[-*•]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'bullet', items });
      continue;
    }

    // Numbered list — collect consecutive numbered lines
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'numbered', items });
      continue;
    }

    // Plain paragraph
    blocks.push({ type: 'paragraph', text: trimmed });
    i++;
  }

  return blocks;
}

/* ─── Block renderers ────────────────────────────────────────── */
function RenderBlock({ block, compact }: { block: Block; compact: boolean }) {
  const gap = compact ? 'mb-1.5' : 'mb-2';

  switch (block.type) {
    case 'h1':
      return (
        <p className={`font-bold text-green-400 ${compact ? 'text-sm' : 'text-base'} ${gap} mt-1`}>
          {parseInline(block.text)}
        </p>
      );
    case 'h2':
      return (
        <p className={`font-semibold text-green-300 ${compact ? 'text-xs' : 'text-sm'} uppercase tracking-wider ${gap} mt-1`}>
          {parseInline(block.text)}
        </p>
      );
    case 'h3':
      return (
        <p className={`font-semibold text-gray-200 ${compact ? 'text-xs' : 'text-sm'} ${gap} mt-0.5`}>
          {parseInline(block.text)}
        </p>
      );

    case 'bullet':
      return (
        <ul className={`space-y-1 ${gap}`}>
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5 shrink-0 text-xs">▸</span>
              <span className={`${compact ? 'text-[0.7rem]' : 'text-xs'} text-gray-300 leading-relaxed`}>
                {parseInline(item)}
              </span>
            </li>
          ))}
        </ul>
      );

    case 'numbered':
      return (
        <ol className={`space-y-1.5 ${gap}`}>
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`shrink-0 w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold leading-none ${compact ? 'text-[0.6rem]' : 'text-[0.65rem]'}`}>
                {i + 1}
              </span>
              <span className={`${compact ? 'text-[0.7rem]' : 'text-xs'} text-gray-300 leading-relaxed flex-1`}>
                {parseInline(item)}
              </span>
            </li>
          ))}
        </ol>
      );

    case 'code':
      return (
        <pre className={`${gap} bg-black/50 border border-white/10 rounded-lg p-3 overflow-x-auto`}>
          <code className="text-green-300 font-mono text-[0.65rem] leading-relaxed whitespace-pre-wrap">
            {block.text}
          </code>
        </pre>
      );

    case 'divider':
      return <hr className={`${gap} border-white/10`} />;

    case 'paragraph':
    default:
      return (
        <p className={`${compact ? 'text-[0.7rem]' : 'text-xs'} text-gray-300 leading-relaxed ${gap}`}>
          {parseInline(block.text)}
        </p>
      );
  }
}

/* ─── Main export ────────────────────────────────────────────── */
interface Props {
  content: string;
  /** compact=true → smaller font sizes for the sidebar panel */
  compact?: boolean;
}

export default function MessageRenderer({ content, compact = false }: Props) {
  const blocks = parseBlocks(content);
  return (
    <div>
      {blocks.map((block, i) => (
        <RenderBlock key={i} block={block} compact={compact} />
      ))}
    </div>
  );
}
