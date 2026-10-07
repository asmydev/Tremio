import 'server-only';
import { Document, Link, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { RESUME_LABELS, type ResumeDoc } from './schema';

/**
 * Mise en page inspirée du thème « classic » de RenderCV (celui des CV LaTeX de référence) :
 * en-tête centré, titres de section en bleu avec filet, entrées sur deux colonnes
 * (organisation et poste à gauche, lieu et dates à droite), sous-groupes de puces.
 * Reste compatible ATS : une colonne de lecture, vrai texte, police intégrée, aucune image.
 */
import './fonts';

const PRIMARY = '#004F90';
const INK = '#000000';
const MUTED = '#404040';

const s = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 34, paddingHorizontal: 42, fontFamily: 'SourceSans3', fontSize: 10, lineHeight: 1.35, color: INK },
  name: { fontSize: 24, lineHeight: 1.15, fontWeight: 'bold', color: PRIMARY, textAlign: 'center', marginBottom: 3 },
  headline: { fontSize: 11.5, textAlign: 'center', marginTop: 2 },
  status: { fontSize: 9.5, fontStyle: 'italic', textAlign: 'center', color: MUTED, marginTop: 1 },
  contact: { fontSize: 9.5, textAlign: 'center', marginTop: 3, color: INK },
  link: { color: INK, textDecoration: 'none' },
  section: { marginTop: 9 },
  heading: { fontSize: 13, fontWeight: 'bold', color: PRIMARY, borderBottomWidth: 0.6, borderBottomColor: PRIMARY, paddingBottom: 1, marginBottom: 5 },
  entry: { marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  left: { flex: 1 },
  right: { textAlign: 'right', fontSize: 9.5 },
  rightCol: { alignItems: 'flex-end' },
  bold: { fontWeight: 'bold' },
  italic: { fontStyle: 'italic' },
  small: { fontSize: 9, fontStyle: 'italic', color: MUTED },
  groupLabel: { fontSize: 8.8, fontWeight: 'bold', color: PRIMARY, marginTop: 3, letterSpacing: 0.3 },
  bullet: { flexDirection: 'row', marginTop: 1.5, paddingLeft: 6 },
  dot: { width: 9 },
  grow: { flex: 1 }
});

/** Convertit **gras** en segments de texte. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return <>{parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <Text key={i} style={s.bold}>{p.slice(2, -2)}</Text> : <Text key={i}>{p}</Text>))}</>;
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={s.bullet}>
      <Text style={s.dot}>•</Text>
      <Text style={s.grow}><Rich text={text} /></Text>
    </View>
  );
}

function Section({ title, children, keep = false }: { title: string; children: React.ReactNode; keep?: boolean }) {
  // keep : petite section gardée entière sur une page, pour éviter un titre orphelin en bas de page.
  return (
    <View style={s.section} wrap={!keep}>
      <Text style={s.heading} minPresenceAhead={40}>{title}</Text>
      {children}
    </View>
  );
}

const dates = (start: string, end: string) => [start, end].map((v) => v.trim()).filter(Boolean).join(' – ');
const href = (v: string) => (/^https?:\/\//.test(v) ? v : `https://${v}`);

export function ResumePdf({ doc, locale }: { doc: ResumeDoc; locale: 'fr' | 'en' }) {
  const L = RESUME_LABELS[locale];
  const colon = locale === 'fr' ? ' : ' : ': ';
  const contacts: { text: string; url?: string }[] = [
    { text: doc.location },
    { text: doc.phone },
    { text: doc.email, url: doc.email ? `mailto:${doc.email}` : undefined },
    { text: doc.linkedin, url: doc.linkedin ? href(doc.linkedin) : undefined },
    { text: doc.github, url: doc.github ? href(doc.github) : undefined },
    { text: doc.website, url: doc.website ? href(doc.website) : undefined }
  ].filter((c) => c.text.trim());

  return (
    <Document title={`${doc.full_name} — ${doc.headline}`} author={doc.full_name} subject={doc.headline} language={locale === 'fr' ? 'fr-CA' : 'en-CA'} creator="Tremio" producer="Tremio">
      <Page size="LETTER" style={s.page}>
        <Text style={s.name}>{doc.full_name}</Text>
        {doc.headline ? <Text style={s.headline}>{doc.headline}</Text> : null}
        {doc.work_status ? <Text style={s.status}>{doc.work_status}</Text> : null}
        <Text style={s.contact}>
          {contacts.map((c, i) => (
            <Text key={i}>
              {i > 0 ? '  |  ' : ''}
              {c.url ? <Link src={c.url} style={s.link}>{c.text.replace(/^https?:\/\//, '')}</Link> : c.text}
            </Text>
          ))}
        </Text>

        {doc.summary ? <Section title={L.summary}><Text><Rich text={doc.summary} /></Text></Section> : null}

        {doc.experience.length > 0 && (
          <Section title={L.experience}>
            {doc.experience.map((e, i) => (
              <View key={i} style={s.entry}>
                <View style={s.row} wrap={false}>
                  <Text style={s.left}>
                    <Text style={s.bold}>{e.organization}</Text>
                    {e.title ? <Text>{' — '}<Text style={s.italic}>{e.title}</Text></Text> : null}
                  </Text>
                  <View style={s.rightCol}>
                    {e.location ? <Text style={s.right}>{e.location}</Text> : null}
                    <Text style={[s.right, s.italic]}>{dates(e.start, e.end)}</Text>
                  </View>
                </View>
                {e.organization_description ? <Text style={s.small}>{e.organization_description}</Text> : null}
                {e.groups.map((g, j) => (
                  <View key={j}>
                    {g.label ? <Text style={s.groupLabel}>{g.label.toUpperCase()}</Text> : null}
                    {g.bullets.map((b, k) => <Bullet key={k} text={b} />)}
                  </View>
                ))}
              </View>
            ))}
          </Section>
        )}

        {doc.projects.length > 0 && (
          <Section title={L.projects}>
            {doc.projects.map((p, i) => (
              <View key={i} style={s.entry} wrap={false}>
                <View style={s.row}>
                  <Text style={s.left}>
                    <Text style={s.bold}>{p.name}</Text>
                    {p.subtitle ? <Text>{' — '}{p.subtitle}</Text> : null}
                  </Text>
                  {p.context ? <Text style={[s.right, s.italic]}>{p.context}</Text> : null}
                </View>
                {p.bullets.map((b, k) => <Bullet key={k} text={b} />)}
                {p.stack ? <Bullet text={`**${L.stack}**${colon}${p.stack}`} /> : null}
              </View>
            ))}
          </Section>
        )}

        {doc.skills.length > 0 && (
          <Section title={L.skills} keep>
            {doc.skills.filter((g) => g.items.length).map((g, i) => (
              <Text key={i} style={{ marginBottom: 1.5 }}><Text style={s.bold}>{g.category}{colon}</Text>{g.items.join(', ')}</Text>
            ))}
          </Section>
        )}

        {doc.education.length > 0 && (
          <Section title={L.education}>
            {doc.education.map((ed, i) => (
              <View key={i} style={s.entry} wrap={false}>
                <View style={s.row}>
                  <Text style={s.left}>
                    <Text style={s.bold}>{ed.school}</Text>
                    {ed.degree ? <Text>{' — '}<Text style={s.italic}>{ed.degree}</Text></Text> : null}
                  </Text>
                  <View style={s.rightCol}>
                    {ed.location ? <Text style={s.right}>{ed.location}</Text> : null}
                    <Text style={[s.right, s.italic]}>{dates(ed.start, ed.end)}</Text>
                  </View>
                </View>
                {ed.details.map((d, k) => <Bullet key={k} text={d} />)}
              </View>
            ))}
          </Section>
        )}

        {doc.certifications.length > 0 && (
          <Section title={L.certifications} keep>
            {doc.certifications.map((c, i) => (
              <View key={i} style={[s.row, { marginBottom: 1.5 }]} wrap={false}>
                <Text style={s.left}><Text style={s.bold}>{c.name}</Text>{c.issuer ? ` — ${c.issuer}` : ''}</Text>
                {c.year ? <Text style={[s.right, s.italic]}>{c.year}</Text> : null}
              </View>
            ))}
          </Section>
        )}

        {doc.publications.length > 0 && (
          <Section title={L.publications} keep>
            {doc.publications.map((p, i) => <Bullet key={i} text={p} />)}
          </Section>
        )}

        {doc.languages.length > 0 && (
          <Section title={L.languages} keep>
            <Text>{doc.languages.map((l) => (l.level ? `${l.language}${colon}${l.level}` : l.language)).join('  |  ')}</Text>
          </Section>
        )}

        {doc.other_sections.filter((o) => o.items.length).map((o, i) => (
          <Section key={i} title={o.title} keep>
            {o.items.map((item, k) => <Bullet key={k} text={item} />)}
          </Section>
        ))}
      </Page>
    </Document>
  );
}

export async function renderResumePdf(doc: ResumeDoc, locale: 'fr' | 'en'): Promise<Buffer> {
  return renderToBuffer(<ResumePdf doc={doc} locale={locale} />);
}
