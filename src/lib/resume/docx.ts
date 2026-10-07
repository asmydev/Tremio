import 'server-only';
import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, LevelFormat, Packer, Paragraph, TabStopType, TextRun
} from 'docx';
import { RESUME_LABELS, type ResumeDoc } from './schema';

/**
 * Version Word (.docx) modifiable du CV adapté : même structure et même couleur que le PDF,
 * avec de vrais styles Word (puces, tabulations, liens) pour être retouchée facilement.
 * Police Calibri : présente sur tous les postes, contrairement à Source Sans 3.
 */
const PRIMARY = '004F90';
const MUTED = '404040';
const FONT = 'Calibri';
const PAGE_W = 12240; // Lettre, en DXA (1440 = 1 po)
const MARGIN = 850;   // environ 1,5 cm
const RIGHT_TAB = PAGE_W - MARGIN * 2;

type RunOpts = { bold?: boolean; italics?: boolean; size?: number; color?: string };

/** Texte avec **gras** → suite de TextRun. */
function rich(text: string, base: RunOpts = {}): TextRun[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part) =>
    part.startsWith('**') && part.endsWith('**')
      ? new TextRun({ text: part.slice(2, -2), ...base, bold: true })
      : new TextRun({ text: part, ...base })
  );
}

const heading = (title: string) => new Paragraph({
  keepNext: true,
  spacing: { before: 200, after: 80 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PRIMARY, space: 1 } },
  children: [new TextRun({ text: title, bold: true, size: 26, color: PRIMARY })]
});

const bullet = (text: string) => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 20 }, children: rich(text) });

/** Ligne à deux colonnes : texte à gauche, texte aligné à droite par tabulation. */
function twoCol(left: TextRun[], right: string, rightItalic = false, opts: { keepNext?: boolean; before?: number } = {}) {
  return new Paragraph({
    keepNext: opts.keepNext ?? true,
    spacing: { before: opts.before ?? 0, after: 0 },
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
    children: [...left, ...(right ? [new TextRun({ text: `\t${right}`, italics: rightItalic, size: 19 })] : [])]
  });
}

const dates = (start: string, end: string) => [start, end].map((v) => v.trim()).filter(Boolean).join(' – ');
const href = (v: string) => (/^https?:\/\//.test(v) ? v : `https://${v}`);

export async function renderResumeDocx(doc: ResumeDoc, locale: 'fr' | 'en'): Promise<Buffer> {
  const L = RESUME_LABELS[locale];
  const colon = locale === 'fr' ? ' : ' : ': ';
  const body: Paragraph[] = [];

  // En-tête
  body.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: doc.full_name, bold: true, size: 44, color: PRIMARY })] }));
  if (doc.headline) body.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: doc.headline, size: 23 })] }));
  if (doc.work_status) body.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: doc.work_status, italics: true, size: 19, color: MUTED })] }));
  const contacts: (TextRun | ExternalHyperlink)[] = [];
  const add = (text: string, link?: string) => {
    if (!text.trim()) return;
    if (contacts.length) contacts.push(new TextRun({ text: '  |  ', size: 19 }));
    const run = new TextRun({ text: text.replace(/^https?:\/\//, ''), size: 19 });
    contacts.push(link ? new ExternalHyperlink({ link, children: [run] }) : run);
  };
  add(doc.location); add(doc.phone); add(doc.email, doc.email ? `mailto:${doc.email}` : undefined);
  add(doc.linkedin, doc.linkedin ? href(doc.linkedin) : undefined); add(doc.github, doc.github ? href(doc.github) : undefined); add(doc.website, doc.website ? href(doc.website) : undefined);
  body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: contacts }));

  if (doc.summary) { body.push(heading(L.summary)); body.push(new Paragraph({ children: rich(doc.summary) })); }

  if (doc.experience.length) {
    body.push(heading(L.experience));
    doc.experience.forEach((e, i) => {
      body.push(twoCol([new TextRun({ text: e.organization, bold: true }), ...(e.title ? [new TextRun({ text: ' — ' }), new TextRun({ text: e.title, italics: true })] : [])], e.location, false, { before: i ? 120 : 0 }));
      body.push(twoCol(e.organization_description ? [new TextRun({ text: e.organization_description, italics: true, size: 18, color: MUTED })] : [], dates(e.start, e.end), true));
      for (const g of e.groups) {
        if (g.label) body.push(new Paragraph({ keepNext: true, spacing: { before: 60 }, children: [new TextRun({ text: g.label.toUpperCase(), bold: true, size: 17, color: PRIMARY })] }));
        g.bullets.forEach((b) => body.push(bullet(b)));
      }
    });
  }

  if (doc.projects.length) {
    body.push(heading(L.projects));
    doc.projects.forEach((p, i) => {
      body.push(twoCol([new TextRun({ text: p.name, bold: true }), ...(p.subtitle ? [new TextRun({ text: ` — ${p.subtitle}` })] : [])], p.context, true, { before: i ? 100 : 0 }));
      p.bullets.forEach((b) => body.push(bullet(b)));
      if (p.stack) body.push(bullet(`**${L.stack}**${colon}${p.stack}`));
    });
  }

  if (doc.skills.length) {
    body.push(heading(L.skills));
    doc.skills.filter((g) => g.items.length).forEach((g) => body.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: `${g.category}${colon}`, bold: true }), new TextRun({ text: g.items.join(', ') })] })));
  }

  if (doc.education.length) {
    body.push(heading(L.education));
    doc.education.forEach((ed, i) => {
      body.push(twoCol([new TextRun({ text: ed.school, bold: true }), ...(ed.degree ? [new TextRun({ text: ' — ' }), new TextRun({ text: ed.degree, italics: true })] : [])], ed.location, false, { before: i ? 100 : 0 }));
      body.push(twoCol([], dates(ed.start, ed.end), true, { keepNext: ed.details.length > 0 }));
      ed.details.forEach((d) => body.push(bullet(d)));
    });
  }

  if (doc.certifications.length) {
    body.push(heading(L.certifications));
    doc.certifications.forEach((c) => body.push(twoCol([new TextRun({ text: c.name, bold: true }), ...(c.issuer ? [new TextRun({ text: ` — ${c.issuer}` })] : [])], c.year, true, { keepNext: false })));
  }

  if (doc.publications.length) { body.push(heading(L.publications)); doc.publications.forEach((p) => body.push(bullet(p))); }

  if (doc.languages.length) {
    body.push(heading(L.languages));
    body.push(new Paragraph({ children: [new TextRun({ text: doc.languages.map((l) => (l.level ? `${l.language}${colon}${l.level}` : l.language)).join('  |  ') })] }));
  }

  for (const o of doc.other_sections.filter((x) => x.items.length)) { body.push(heading(o.title)); o.items.forEach((item) => body.push(bullet(item))); }

  const document = new Document({
    creator: 'Tremio',
    title: `${doc.full_name} — ${doc.headline}`,
    styles: { default: { document: { run: { font: FONT, size: 20 }, paragraph: { spacing: { line: 264 } } } } },
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 220 } } } }]
      }]
    },
    sections: [{
      properties: { page: { size: { width: PAGE_W, height: 15840 }, margin: { top: 720, bottom: 720, left: MARGIN, right: MARGIN } } },
      children: body
    }]
  });
  return Packer.toBuffer(document);
}
