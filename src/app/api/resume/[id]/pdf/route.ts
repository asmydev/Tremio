import { loadGeneratedDocument, fileResponse, PDF } from '@/lib/documents/load';
import { ResumeDocSchema } from '@/lib/resume/schema';
import { renderResumePdf } from '@/lib/resume/pdf';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await loadGeneratedDocument((await params).id, 'resume_pdf', ResumeDocSchema, 'CV');
  if (!res.ok) return new Response(null, { status: res.status });
  return fileResponse(await renderResumePdf(res.doc, res.locale), `${res.basename}.pdf`, PDF);
}
