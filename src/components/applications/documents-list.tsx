'use client';

import { useState, useTransition } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Copy, Check, Trash2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Markdown } from '@/components/markdown';
import { deleteDocument } from '@/app/[locale]/(app)/applications/actions';

export interface SavedDocument { id: string; kind: string; locale: string; content: string; created_at: string; title: string }

export function DocumentsList({ documents }: { documents: SavedDocument[] }) {
  const t = useTranslations('applications');
  const format = useFormatter();
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);
  const [, start] = useTransition();

  if (documents.length === 0) return <p className="text-sm text-ink-muted">{t('noDocuments')}</p>;

  return (
    <ul className="flex flex-col gap-2.5">
      {documents.map((doc) => (
        <li key={doc.id}>
          <details className="group rounded-lg border border-line bg-surface-1">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0">
                <span className="block font-semibold">{doc.title}</span>
                <span className="text-[13px] text-ink-muted">{format.dateTime(new Date(doc.created_at), { dateStyle: 'medium', timeStyle: 'short' })} · {doc.locale.toUpperCase()}</span>
              </span>
              <span className="text-[13px] font-semibold text-accent group-open:hidden">{t('show')}</span>
            </summary>
            <div className="border-t border-line px-4 py-3 text-ink-2">
              <Markdown>{doc.content}</Markdown>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={async () => { await navigator.clipboard.writeText(doc.content); setCopied(doc.id); setTimeout(() => setCopied(null), 2000); }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line-strong px-3.5 text-sm font-semibold">
                  {copied === doc.id ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                  {copied === doc.id ? t('copied') : t('copy')}
                </button>
                <button type="button" onClick={() => { if (window.confirm(t('confirmDeleteDocument'))) start(async () => { await deleteDocument(doc.id); router.refresh(); }); }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-signal-strong hover:bg-signal-soft">
                  <Trash2 size={16} aria-hidden="true" />{t('delete')}
                </button>
              </div>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
