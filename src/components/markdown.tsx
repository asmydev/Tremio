import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Affiche la réponse de l'IA (Markdown) avec les styles Boréal.
 * Le HTML brut éventuellement renvoyé par le modèle n'est pas interprété (comportement par défaut).
 */
const components: Components = {
  h1: ({ node: _node, ...p }) => <h3 className="mt-5 mb-2 font-display text-xl font-medium text-ink first:mt-0" {...p} />,
  h2: ({ node: _node, ...p }) => <h3 className="mt-5 mb-2 font-display text-xl font-medium text-ink first:mt-0" {...p} />,
  h3: ({ node: _node, ...p }) => <h4 className="mt-5 mb-1.5 font-display text-[17px] font-medium text-ink first:mt-0" {...p} />,
  h4: ({ node: _node, ...p }) => <h5 className="mt-4 mb-1 font-semibold text-ink first:mt-0" {...p} />,
  p: ({ node: _node, ...p }) => <p className="my-2.5 leading-relaxed" {...p} />,
  ul: ({ node: _node, ...p }) => <ul className="my-2.5 list-disc space-y-1.5 pl-5 marker:text-ink-muted" {...p} />,
  ol: ({ node: _node, ...p }) => <ol className="my-2.5 list-decimal space-y-1.5 pl-5 marker:text-ink-muted" {...p} />,
  strong: ({ node: _node, ...p }) => <strong className="font-semibold text-ink" {...p} />,
  a: ({ node: _node, ...p }) => <a className="font-medium text-accent underline underline-offset-2" target="_blank" rel="noreferrer" {...p} />,
  blockquote: ({ node: _node, ...p }) => <blockquote className="my-3 border-l-2 border-line-strong pl-4 text-ink-muted" {...p} />,
  hr: () => <hr className="my-5 border-line" />,
  code: ({ node: _node, ...p }) => <code className="rounded-sm bg-surface-0 px-1.5 py-0.5 font-mono text-[13px]" {...p} />,
  table: ({ node: _node, ...p }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...p} />
    </div>
  ),
  th: ({ node: _node, ...p }) => <th className="border-b border-line-strong px-3 py-2 text-left font-semibold text-ink" {...p} />,
  td: ({ node: _node, ...p }) => <td className="border-b border-line px-3 py-2 align-top" {...p} />
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
