import { loadGeneratedDocument, fileResponse, PDF } from '@/lib/documents/load';
import { LetterDocSchema } from '@/lib/letter/schema';
import { renderLetterPdf } from '@/lib/letter/pdf';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const res = await loadGeneratedDocument((await params).id, 'cover_letter_doc', LetterDocSchema, 'Lettre');
  if (!res.ok) return new Response(null, { status: res.status });
  return fileResponse(await renderLetterPdf(res.doc, res.locale), `${res.basename}.pdf`, PDF);
}
