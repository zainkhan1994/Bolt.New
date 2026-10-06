import type { ReactNode } from 'react';

/**
 * Minimal, safe renderer for the content format used by pages:
 * paragraphs, "## " / "### " headings and "- " bullet lists.
 * Renders React elements only — no HTML injection.
 */
export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, '\n').split(/\n{2,}/);
  const out: ReactNode[] = [];

  blocks.forEach((block, i) => {
    const lines = block.split('\n').filter((l) => l.trim() !== '');
    if (lines.length === 0) return;

    let rest = lines;
    const heading = rest[0].match(/^(#{2,3})\s+(.*)$/);
    if (heading) {
      out.push(
        heading[1] === '##' ? (
          <h2 key={`h${i}`} className="mt-8 text-xl font-semibold tracking-tight text-slate-900">{heading[2]}</h2>
        ) : (
          <h3 key={`h${i}`} className="mt-6 text-lg font-semibold text-slate-900">{heading[2]}</h3>
        ),
      );
      rest = rest.slice(1);
    }
    if (rest.length === 0) return;

    if (rest.every((l) => /^[-*]\s+/.test(l))) {
      out.push(
        <ul key={`l${i}`} className="mt-3 list-disc space-y-1.5 pl-6 text-slate-700">
          {rest.map((l, j) => <li key={j}>{l.replace(/^[-*]\s+/, '')}</li>)}
        </ul>,
      );
    } else {
      out.push(
        <p key={`p${i}`} className="mt-4 leading-7 text-slate-700">
          {rest.join(' ')}
        </p>,
      );
    }
  });

  return <div className="[&>*:first-child]:mt-0">{out}</div>;
}
