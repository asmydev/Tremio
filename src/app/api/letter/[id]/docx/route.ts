import { loadGeneratedDocument, fileResponse, DOCX } from '@/lib/documents/load';
import { LetterDocSchema } from '@/lib/letter/schema';
import { renderLetterDocx } from '@/lib/letter/docx';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await loadGeneratedDocument((await params).id, 'cover_letter_doc', LetterDocSchema, 'Lettre');
  if (!res.ok) return new Response(null, { status: res.status });
  return fileResponse(await renderLetterDocx(res.doc), `${res.basename}.docx`, DOCX);
}
