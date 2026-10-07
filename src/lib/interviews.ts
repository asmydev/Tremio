import { z } from 'zod';

export const QuestionSchema = z.object({
  text: z.string().describe('La question, telle que la poserait le recruteur'),
  kind: z.enum(['behavioral', 'technical', 'motivation']).describe('behavioral = situation vécue (STAR), technical = compétence du poste, motivation = intérêt pour le poste ou l’entreprise')
});
export const QuestionsSchema = z.object({ questions: z.array(QuestionSchema).describe('Exactement 5 questions, de la plus probable à la moins probable') });

export const FeedbackSchema = z.object({
  score: z.number().describe('Entier de 1 à 5 : 1 = à retravailler, 5 = excellente réponse'),
  star: z.object({
    situation: z.boolean(), task: z.boolean(), action: z.boolean(), result: z.boolean()
  }).describe('Éléments STAR clairement présents dans la réponse'),
  strengths: z.array(z.string()).describe('1 à 3 points forts concrets de la réponse'),
  improvements: z.array(z.string()).describe('1 à 3 améliorations précises et actionnables'),
  improved: z.string().describe('Une version améliorée de la réponse, fidèle aux faits donnés par le candidat, en 120 mots maximum; si un chiffre manque, le signaler entre crochets')
});

export type Question = z.infer<typeof QuestionSchema>;
export type Feedback = z.infer<typeof FeedbackSchema>;
export interface Answer { index: number; answer: string; feedback: Feedback }
export interface Session { id: string; application_id: string; locale: 'fr' | 'en'; questions: Question[]; answers: Answer[]; created_at: string }
