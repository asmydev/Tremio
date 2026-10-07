import { loadGeneratedDocument, fileResponse, DOCX } from '@/lib/documents/load';
import { ResumeDocSchema } from '@/lib/resume/schema';
import { renderResumeDocx } from '@/lib/resume/docx';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await loadGeneratedDocument((await params).id, 'resume_pdf', ResumeDocSchema, 'CV');
  if (!res.ok) return new Response(null, { status: res.status });
  return fileResponse(await renderResumeDocx(res.doc, res.locale), `${res.basename}.docx`, DOCX);
}
