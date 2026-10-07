'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { saveProfile, suggestProfileFromResume } from '@/app/[locale]/(app)/profile/actions';

type Values = {
  full_name: string; headline: string; identity_statement: string;
  target_roles: string; skills: string; locations: string; doc_locale: 'fr' | 'en'; grammatical_gender: '' | 'feminine' | 'masculine' | 'neutral';
  phone: string; contact_email: string; linkedin_url: string; github_url: string; website_url: string; work_status: string;
};

const merge = (current: string, extra: string[]) =>
  Array.from(new Set([...current.split(',').map((s) => s.trim()).filter(Boolean), ...extra])).join(', ');

export function ProfileForm({ initial, hasResume }: { initial: Values; hasResume: boolean }) {
  const t = useTranslations('profile');
  const locale = useLocale() as 'fr' | 'en';
  const [values, setValues] = useState<Values>(initial);
  const [saving, startSave] = useTransition();
  const [suggesting, startSuggest] = useTransition();
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues({ ...values, [key]: e.target.value });

  function suggest() {
    setMessage(null);
    startSuggest(async () => {
      const res = await suggestProfileFromResume(locale);
      if (!res.ok) return setMessage({ tone: 'error', text: t(`errors.${res.error}`) });
      const s = res.suggestion;
      // On complète sans écraser ce que l'utilisateur a déjà écrit ; les listes sont fusionnées.
      setValues((v) => ({
        ...v,
        full_name: v.full_name || s.full_name,
        headline: v.headline || s.headline,
        identity_statement: v.identity_statement || s.identity_statement,
        target_roles: merge(v.target_roles, s.target_roles),
        skills: merge(v.skills, s.skills),
        locations: merge(v.locations, s.locations)
      }));
      setMessage({ tone: 'ok', text: t('suggested') });
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setMessage(null);
    startSave(async () => {
      const res = await saveProfile(data);
      setMessage(res.ok ? { tone: 'ok', text: t('saved') } : { tone: 'error', text: t(`errors.${res.error}`) });
    });
  }

  const field = 'w-full rounded-md border border-line-strong bg-surface-1 px-4 py-3 text-ink';
  const label = 'flex flex-col gap-1.5 text-sm font-semibold text-ink-2';
  const hint = 'text-[13px] font-normal text-ink-muted';

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 rounded-xl border border-line bg-surface-1 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-medium">{t('formTitle')}</h2>
        <button type="button" onClick={suggest} disabled={!hasResume || suggesting}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-accent-soft px-4 font-semibold text-accent-strong disabled:opacity-50">
          <Sparkles size={16} aria-hidden="true" />
          {suggesting ? t('suggesting') : t('suggest')}
        </button>
      </div>
      {!hasResume && <p className={hint}>{t('suggestNeedsResume')}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>{t('fullName')}<input name="full_name" value={values.full_name} onChange={set('full_name')} className={field} autoComplete="name" /></label>
        <label className={label}>{t('headline')}<input name="headline" value={values.headline} onChange={set('headline')} className={field} /></label>
      </div>
      <label className={label}>
        {t('identity')}
        <textarea name="identity_statement" rows={4} value={values.identity_statement} onChange={set('identity_statement')} className={field} />
        <span className={hint}>{t('identityHint')}</span>
      </label>
      <label className={label}>{t('targetRoles')}<input name="target_roles" value={values.target_roles} onChange={set('target_roles')} className={field} /><span className={hint}>{t('listHint')}</span></label>
      <label className={label}>{t('skills')}<textarea name="skills" rows={3} value={values.skills} onChange={set('skills')} className={field} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>{t('locations')}<input name="locations" value={values.locations} onChange={set('locations')} className={field} /></label>
        <label className={label}>
          {t('docLocale')}
          <select name="doc_locale" value={values.doc_locale} onChange={set('doc_locale')} className={field}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>

      <fieldset className="flex flex-col gap-4 rounded-lg border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-ink">{t('contactTitle')}</legend>
        <p className={hint}>{t('contactHint')}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>{t('phone')}<input name="phone" type="tel" value={values.phone} onChange={set('phone')} className={field} autoComplete="tel" /></label>
          <label className={label}>{t('contactEmail')}<input name="contact_email" type="email" value={values.contact_email} onChange={set('contact_email')} className={field} autoComplete="email" /></label>
          <label className={label}>LinkedIn<input name="linkedin_url" value={values.linkedin_url} onChange={set('linkedin_url')} placeholder="linkedin.com/in/…" className={field} /></label>
          <label className={label}>GitHub<input name="github_url" value={values.github_url} onChange={set('github_url')} placeholder="github.com/…" className={field} /></label>
          <label className={label}>{t('website')}<input name="website_url" value={values.website_url} onChange={set('website_url')} className={field} /></label>
          <label className={label}>{t('workStatus')}<input name="work_status" value={values.work_status} onChange={set('work_status')} placeholder={t('workStatusPlaceholder')} className={field} /></label>
        </div>
      </fieldset>

      <label className={label}>
        {t('gender')}
        <select name="grammatical_gender" value={values.grammatical_gender} onChange={set('grammatical_gender')} className={field}>
          <option value="">{t('genderUnset')}</option>
          <option value="feminine">{t('genderFeminine')}</option>
          <option value="masculine">{t('genderMasculine')}</option>
          <option value="neutral">{t('genderNeutral')}</option>
        </select>
        <span className={hint}>{t('genderHint')}</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="min-h-[50px] rounded-[14px] bg-accent px-6 font-semibold text-accent-fg disabled:opacity-60">
          {saving ? t('saving') : t('save')}
        </button>
        {message && (
          <p role={message.tone === 'error' ? 'alert' : 'status'} className={`rounded-md px-4 py-2.5 text-sm ${message.tone === 'ok' ? 'bg-accent-soft text-accent-strong' : 'bg-signal-soft text-signal-strong'}`}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
