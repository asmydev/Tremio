export const STATUSES = ['to_apply', 'sent', 'interview', 'offer', 'rejected'] as const;
export type Status = (typeof STATUSES)[number];
export type Tone = 'ready' | 'decision' | 'neutral';

export interface Application {
  id: string;
  title: string;
  company: string | null;
  status: Status;
  position: number;
  location: string | null;
  lang: 'fr' | 'en' | null;
  job_url: string | null;
  job_description: string | null;
  interview_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Prochaine action proposée pour une candidature, selon son statut. */
export function nextAction(app: Pick<Application, 'status' | 'updated_at' | 'job_description'>): { key: string; templateId?: string; tone: Tone } {
  const days = (Date.now() - new Date(app.updated_at).getTime()) / 86_400_000;
  switch (app.status) {
    case 'to_apply':
      return app.job_description ? { key: 'tailor', templateId: 'tailor-resume', tone: 'ready' } : { key: 'addPosting', tone: 'decision' };
    case 'sent':
      return days >= 7 ? { key: 'followUp', tone: 'decision' } : { key: 'research', templateId: 'company-research', tone: 'neutral' };
    case 'interview':
      return { key: 'practice', templateId: 'interview-star', tone: 'ready' };
    case 'offer':
      return { key: 'decide', tone: 'decision' };
    case 'rejected':
      return { key: 'keepInTouch', tone: 'neutral' };
  }
}

/** Type de document enregistré selon l'action IA qui l'a produit. */
export function documentKind(templateId: string): string {
  return ({ 'tailor-resume': 'resume', 'cover-letter': 'cover_letter', 'thank-you-email': 'email' } as Record<string, string>)[templateId] ?? 'notes';
}
