import { ChevronDown } from 'lucide-react';

/**
 * Section repliable (menu déroulant) basée sur <details>/<summary> :
 * accessible au clavier et aux lecteurs d'écran, sans JavaScript.
 */
export function Collapsible({ title, meta, defaultOpen = false, children }: {
  title: string; meta?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-line bg-surface-1">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-5 py-3 hover:bg-surface-0 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-3">
          <span className="font-display text-xl font-medium">{title}</span>
          {meta && <span className="text-[13px] text-ink-muted">{meta}</span>}
        </span>
        <ChevronDown size={20} aria-hidden="true" className="flex-none text-ink-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-5 py-5">{children}</div>
    </details>
  );
}
