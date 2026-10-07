import { z } from 'zod';

/** Lettre de présentation structurée (format québécois / canadien). */
export const LetterDocSchema = z.object({
  full_name: z.string(),
  headline: z.string().describe('Même titre que le CV adapté : titre du poste visé accordé, puis 2 ou 3 spécialités'),
  location: z.string(),
  phone: z.string(),
  email: z.string(),
  linkedin: z.string(),
  place_date: z.string().describe('Ville et date, ex. « Québec, le 7 octobre 2026 » / « Quebec City, October 7, 2026 »'),
  recipient: z.object({
    name: z.string().describe('Nom de la personne responsable du recrutement si l’offre le donne, sinon vide'),
    title: z.string().describe('Fonction de cette personne si connue, sinon vide'),
    company: z.string(),
    address: z.string().describe('Adresse ou ville de l’entreprise si connue, sinon vide')
  }),
  subject: z.string().describe('Objet, ex. « Objet : Candidature au poste de technicienne en support informatique »'),
  salutation: z.string().describe('Ex. « Madame, Monsieur, » ou « Madame Tremblay, » / « Dear Hiring Manager, »'),
  paragraphs: z.array(z.string()).describe('3 ou 4 paragraphes, 250 à 350 mots au total; **gras** autorisé avec parcimonie'),
  closing: z.string().describe('Formule de politesse complète'),
  keywords_used: z.array(z.string())
});
export type LetterDoc = z.infer<typeof LetterDocSchema>;
