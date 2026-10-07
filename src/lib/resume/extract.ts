import 'server-only';
import { extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const TYPES = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  txt: ['text/plain']
} as const;

export class ResumeFileError extends Error {
  constructor(public readonly code: 'too_large' | 'unsupported' | 'empty' | 'unreadable') {
    super(code);
  }
}

function kindOf(file: File): keyof typeof TYPES | null {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf' || file.type === TYPES.pdf[0]) return 'pdf';
  if (ext === 'docx' || file.type === TYPES.docx[0]) return 'docx';
  if (ext === 'txt' || file.type === TYPES.txt[0]) return 'txt';
  return null;
}

/** Extrait le texte brut d'un CV (PDF, DOCX ou TXT). */
export async function extractResumeText(file: File): Promise<string> {
  if (file.size > MAX_RESUME_BYTES) throw new ResumeFileError('too_large');
  const kind = kindOf(file);
  if (!kind) throw new ResumeFileError('unsupported');

  const buffer = new Uint8Array(await file.arrayBuffer());
  let text = '';
  try {
    if (kind === 'pdf') {
      const pdf = await getDocumentProxy(buffer);
      text = (await extractText(pdf, { mergePages: true })).text;
    } else if (kind === 'docx') {
      text = (await mammoth.extractRawText({ buffer: Buffer.from(buffer) })).value;
    } else {
      text = new TextDecoder().decode(buffer);
    }
  } catch {
    throw new ResumeFileError('unreadable');
  }

  text = text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
  // Un PDF scanné (image) ne contient pas de texte : on le signale plutôt que d'enregistrer un CV vide.
  if (text.length < 150) throw new ResumeFileError('empty');
  return text;
}
