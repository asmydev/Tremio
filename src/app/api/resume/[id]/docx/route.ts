import { loadResumeDocument } from '@/lib/resume/load';
import { renderResumeDocx } from '@/lib/resume/docx';

export const runtime = 'nodejs';

/** Télécharge un CV adapté en Word (.docx), modifiable. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await loadResumeDocument(id);
  if (!res.ok) return new Response(null, { status: res.status });
  const docx = await renderResumeDocx(res.doc, res.locale);
  return new Response(new Uint8Array(docx), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${res.basename}.docx"`,
      'Cache-Control': 'private, no-store'
    }
  });
}
