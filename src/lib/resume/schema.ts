import { z } from 'zod';

/**
 * CV structuré produit par l'IA, puis mis en page en PDF compatible ATS.
 * Les textes peuvent contenir **gras** (Markdown) pour faire ressortir les mots-clés.
 */
export const ResumeDocSchema = z.object({
  full_name: z.string(),
  headline: z.string().describe('Titre du poste visé (traduit et accordé), puis « — » et 2 ou 3 spécialités du candidat liées à l’offre'),
  work_status: z.string().describe('Statut de travail tel qu’indiqué dans le CV source, ex. « Résidente permanente du Canada »; vide sinon'),
  location: z.string(),
  phone: z.string(),
  email: z.string(),
  linkedin: z.string(),
  github: z.string(),
  website: z.string(),
  summary: z.string().describe('Profil professionnel de 3 à 5 phrases, orienté vers le poste'),
  experience: z.array(z.object({
    organization: z.string(),
    title: z.string(),
    organization_description: z.string().describe('Courte description du secteur ou du type de poste si présente dans le CV source, sinon vide'),
    location: z.string(),
    start: z.string(),
    end: z.string(),
    groups: z.array(z.object({
      label: z.string().describe('Sous-titre de regroupement en majuscules (ex. « SUPPORT ET RÉSEAUX »), ou vide si aucun regroupement'),
      bullets: z.array(z.string())
    }))
  })),
  projects: z.array(z.object({
    name: z.string(),
    subtitle: z.string().describe('Courte description, ex. « plateforme e-commerce full-stack »'),
    context: z.string().describe('Ex. « En production », « Projet personnel »'),
    bullets: z.array(z.string()),
    stack: z.string().describe('Technologies séparées par des virgules')
  })),
  skills: z.array(z.object({ category: z.string(), items: z.array(z.string()) })),
  education: z.array(z.object({ degree: z.string(), school: z.string(), location: z.string(), start: z.string(), end: z.string(), details: z.array(z.string()) })),
  certifications: z.array(z.object({ name: z.string(), issuer: z.string(), year: z.string() })),
  publications: z.array(z.string()),
  languages: z.array(z.object({ language: z.string(), level: z.string() })),
  other_sections: z.array(z.object({ title: z.string(), items: z.array(z.string()) })).describe('Toute autre section du CV source (bénévolat, distinctions, etc.), conservée telle quelle'),
  keywords_used: z.array(z.string()).describe('Mots-clés de l’offre intégrés au CV parce que le CV les justifie'),
  missing_keywords: z.array(z.string()).describe('Exigences importantes de l’offre que le CV ne permet pas de justifier')
});
export type ResumeDoc = z.infer<typeof ResumeDocSchema>;

export const RESUME_LABELS = {
  fr: { summary: 'Profil professionnel', experience: 'Expérience professionnelle', projects: 'Projets', skills: 'Compétences', education: 'Formation', certifications: 'Certifications', publications: 'Publications', languages: 'Langues', stack: 'Technologies' },
  en: { summary: 'Professional Summary', experience: 'Professional Experience', projects: 'Projects', skills: 'Skills', education: 'Education', certifications: 'Certifications', publications: 'Publications', languages: 'Languages', stack: 'Stack' }
} as const;
