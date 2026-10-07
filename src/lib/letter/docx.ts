import 'server-only';
import { AlignmentType, BorderStyle, Document, ExternalHyperlink, Packer, Paragraph, TextRun } from 'docx';
import type { LetterDoc } from './schema';

/** Version Word modifiable de la lettre de présentation. */
const PRIMARY = '004F90';
const FONT = 'Calibri';

function rich(text: string): TextRun[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) =>
    part.startsWith('**') && part.endsWith('**') ? new TextRun({ text: part.slice(2, -2), bold: true }) : new TextRun({ text: part })
  );
}
const href = (v: string) => (/^https?:\/\//.test(v) ? v : `https://${v}`);

export async function renderLetterDocx(doc: LetterDoc): Promise<Buffer> {
  const contacts: (TextRun | ExternalHyperlink)[] = [];
  const add = (text: string, link?: string) => {
    if (!text.trim()) return;
    if (contacts.length) contacts.push(new TextRun({ text: '  |  ', size: 19 }));
    const run = new TextRun({ text: text.replace(/^https?:\/\//, ''), size: 19 });
    contacts.push(link ? new ExternalHyperlink({ link, children: [run] }) : run);
  };
  add(doc.location); add(doc.phone); add(doc.email, doc.email ? `mailto:${doc.email}` : undefined); add(doc.linkedin, doc.linkedin ? href(doc.linkedin) : undefined);

  const recipient = [doc.recipient.name, doc.recipient.title, doc.recipient.company, doc.recipient.address].filter((v) => v.trim());
  const body: Paragraph[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: doc.full_name, bold: true, size: 40, color: PRIMARY })] }),
    ...(doc.headline ? [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: doc.headline, size: 22 })] })] : []),
    new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PRIMARY, space: 6 } }, spacing: { after: 360 }, children: contacts }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 320 }, children: [new TextRun(doc.place_date)] }),
    ...recipient.map((line, i) => new Paragraph({ spacing: { after: i === recipient.length - 1 ? 320 : 0 }, children: [new TextRun({ text: line, bold: i === 0 })] })),
    new Paragraph({ spacing: { after: 280 }, children: [new TextRun({ text: doc.subject, bold: true })] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun(doc.salutation)] }),
    ...doc.paragraphs.map((p) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, children: rich(p) })),
    new Paragraph({ spacing: { before: 120, after: 560 }, children: [new TextRun(doc.closing)] }),
    new Paragraph({ children: [new TextRun({ text: doc.full_name, bold: true })] })
  ];

  const document = new Document({
    creator: 'Tremio',
    title: doc.subject,
    styles: { default: { document: { run: { font: FONT, size: 22 }, paragraph: { spacing: { line: 276 } } } } },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 800, bottom: 900, left: 1200, right: 1200 } } }, children: body }]
  });
  return Packer.toBuffer(document);
}
