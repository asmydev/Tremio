import 'server-only';
import { Document, Link, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import '@/lib/resume/fonts';
import type { LetterDoc } from './schema';

/** Lettre de présentation : même en-tête que le CV (cohérence du dossier de candidature). */
const PRIMARY = '#004F90';
const MUTED = '#404040';

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 46, paddingHorizontal: 60, fontFamily: 'SourceSans3', fontSize: 11, lineHeight: 1.45, color: '#000' },
  name: { fontSize: 22, lineHeight: 1.15, fontWeight: 'bold', color: PRIMARY, textAlign: 'center', marginBottom: 2 },
  headline: { fontSize: 11, textAlign: 'center' },
  contact: { fontSize: 9.5, textAlign: 'center', marginTop: 3 },
  rule: { borderBottomWidth: 0.6, borderBottomColor: PRIMARY, marginTop: 10, marginBottom: 18 },
  link: { color: '#000', textDecoration: 'none' },
  date: { textAlign: 'right', marginBottom: 16 },
  recipient: { marginBottom: 16 },
  subject: { fontWeight: 'bold', marginBottom: 14 },
  paragraph: { marginBottom: 10, textAlign: 'justify' },
  closing: { marginTop: 6, marginBottom: 28 },
  bold: { fontWeight: 'bold' },
  muted: { color: MUTED }
});

function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return <>{parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <Text key={i} style={s.bold}>{p.slice(2, -2)}</Text> : <Text key={i}>{p}</Text>))}</>;
}

const href = (v: string) => (/^https?:\/\//.test(v) ? v : `https://${v}`);

export function LetterPdf({ doc, locale }: { doc: LetterDoc; locale: 'fr' | 'en' }) {
  const contacts = [
    { text: doc.location },
    { text: doc.phone },
    { text: doc.email, url: doc.email ? `mailto:${doc.email}` : undefined },
    { text: doc.linkedin, url: doc.linkedin ? href(doc.linkedin) : undefined }
  ].filter((c) => c.text.trim());
  const recipient = [doc.recipient.name, doc.recipient.title, doc.recipient.company, doc.recipient.address].filter((v) => v.trim());

  return (
    <Document title={doc.subject} author={doc.full_name} language={locale === 'fr' ? 'fr-CA' : 'en-CA'} creator="Tremio" producer="Tremio">
      <Page size="LETTER" style={s.page}>
        <Text style={s.name}>{doc.full_name}</Text>
        {doc.headline ? <Text style={s.headline}>{doc.headline}</Text> : null}
        <Text style={s.contact}>
          {contacts.map((c, i) => (
            <Text key={i}>{i > 0 ? '  |  ' : ''}{c.url ? <Link src={c.url} style={s.link}>{c.text.replace(/^https?:\/\//, '')}</Link> : c.text}</Text>
          ))}
        </Text>
        <View style={s.rule} />

        <Text style={s.date}>{doc.place_date}</Text>
        {recipient.length > 0 && (
          <View style={s.recipient}>
            {recipient.map((line, i) => <Text key={i} style={i === 0 ? s.bold : undefined}>{line}</Text>)}
          </View>
        )}
        <Text style={s.subject}>{doc.subject}</Text>
        <Text style={s.paragraph}>{doc.salutation}</Text>
        {doc.paragraphs.map((p, i) => <Text key={i} style={s.paragraph}><Rich text={p} /></Text>)}
        <Text style={s.closing}>{doc.closing}</Text>
        <Text style={s.bold}>{doc.full_name}</Text>
      </Page>
    </Document>
  );
}

export async function renderLetterPdf(doc: LetterDoc, locale: 'fr' | 'en'): Promise<Buffer> {
  return renderToBuffer(<LetterPdf doc={doc} locale={locale} />);
}
