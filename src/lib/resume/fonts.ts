import 'server-only';
import path from 'node:path';
import { Font } from '@react-pdf/renderer';

/** Enregistre une seule fois la police des documents PDF (CV et lettres). */
const FONT_DIR = path.join(process.cwd(), 'src/lib/resume/fonts');
const g = globalThis as unknown as { __tremioFonts?: boolean };
if (!g.__tremioFonts) {
  Font.register({
    family: 'SourceSans3',
    fonts: [
      { src: path.join(FONT_DIR, 'SourceSans3-Regular.ttf') },
      { src: path.join(FONT_DIR, 'SourceSans3-Bold.ttf'), fontWeight: 'bold' },
      { src: path.join(FONT_DIR, 'SourceSans3-It.ttf'), fontStyle: 'italic' },
      { src: path.join(FONT_DIR, 'SourceSans3-BoldIt.ttf'), fontWeight: 'bold', fontStyle: 'italic' }
    ]
  });
  Font.registerHyphenationCallback((word) => [word]); // pas de césure automatique
  g.__tremioFonts = true;
}
