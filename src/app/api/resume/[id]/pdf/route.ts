import { loadResumeDocument } from '@/lib/resume/load';
import { renderResumePdf } from '@/lib/resume/pdf';

export const runtime = 'nodejs';

/** Télécharge un CV adapté en PDF. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await loadResumeDocument(id);
  if (!res.ok) return new Response(null, { status: res.status });
  const pdf = await renderResumePdf(res.doc, res.locale);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${res.basename}.pdf"`,
      'Cache-Control': 'private, no-store'
    }
  });
}
