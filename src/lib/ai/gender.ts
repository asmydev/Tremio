/** Consigne d'accord grammatical en français selon le choix fait dans le profil (jamais déduit du nom). */
export function genderRule(choice: string | null | undefined): string {
  switch (choice) {
    case 'feminine':
      return 'In French, use feminine forms for job titles and agreements (e.g. développeuse, analyste, ingénieure, conseillère, informaticienne, spécialisée, motivée).';
    case 'masculine':
      return 'In French, use masculine forms for job titles and agreements (e.g. développeur, analyste, ingénieur, conseiller, informaticien, spécialisé, motivé).';
    case 'neutral':
      return 'In French, prefer epicene wording (e.g. « spécialiste », « analyste », « personne responsable de… ») and avoid gendered agreements where possible. Never use inclusive dots (·) or parentheses.';
    default:
      return 'In French, keep the grammatical gender the candidate already uses in the résumé for themselves; if it is unclear, prefer epicene wording. Never guess gender from the name.';
  }
}
