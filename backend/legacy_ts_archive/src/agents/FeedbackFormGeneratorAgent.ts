import { z } from 'zod';
import { DbProject } from '../models/db.js';
import { getAIProvider } from '../providers/AIProvider.js';
import { PromptSanitizer } from '../security/PromptSanitizer.js';
import { FeedbackStrategy } from './FeedbackStrategyAgent.js';
import { ProjectProfile } from './ProjectUnderstandingAgent.js';

export const FormQuestionItemSchema = z.object({
  prompt: z.string(),
  description: z.string().optional(),
  questionType: z.enum([
    'rating',
    'multiple_choice',
    'checkbox',
    'yes_no',
    'likert',
    'nps',
    'short_text',
    'long_text',
    'emoji_rating'
  ]),
  isRequired: z.boolean(),
  sortOrder: z.number(),
  minLabel: z.string().optional(),
  maxLabel: z.string().optional(),
  options: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        sortOrder: z.number()
      })
    )
    .optional()
});

export const FormGenerationResultSchema = z.object({
  strategy: z.string().optional(),
  questions: z.array(FormQuestionItemSchema)
});

export type GeneratedQuestion = z.infer<typeof FormQuestionItemSchema>;

export class FeedbackFormGeneratorAgent {
  public static async generate(
    project: DbProject,
    profile: ProjectProfile,
    strategy: FeedbackStrategy
  ): Promise<GeneratedQuestion[]> {
    const ai = getAIProvider();

    const systemPrompt = `You are Agent 7: FeedbackFormGeneratorAgent.
Generate between 8 and 12 neutral, high-value questions tailored specifically for the project.
Cover diverse question types:
- rating (1-5 stars)
- likert (1-5 scale with min/max labels)
- nps (0-10 Net Promoter Score)
- yes_no
- multiple_choice (include 3-4 options)
- checkbox (include 3-4 options)
- short_text
- long_text
- emoji_rating (1-5 sentiment)

CRITICAL RULES:
1. Do not ask leading or biased questions.
2. Ensure questions directly reference the project's domain (${project.category}).
3. Return valid JSON matching the schema with an array of "questions".`;

    const userPrompt = `Project Name: ${project.name}
Category: ${project.category}
Goal: ${project.feedbackGoal}
Problem: ${PromptSanitizer.sanitizeUntrusted(project.problemStatement || '', 'problem')}
Solution: ${PromptSanitizer.sanitizeUntrusted(project.solution || '', 'solution')}
Strategy Focus Areas: ${strategy.focusAreas.join(', ')}
Key Flows: ${profile.coreFlows.join(', ')}`;

    try {
      const result = await ai.generateStructured<{ questions: GeneratedQuestion[] }>({
        systemPrompt,
        userPrompt,
        responseSchema: FormGenerationResultSchema
      });

      if (result && Array.isArray(result.questions) && result.questions.length > 0) {
        return result.questions.map((q, idx) => ({
          ...q,
          sortOrder: idx + 1
        }));
      }
    } catch {
      // Handled by default fallback
    }

    // High quality deterministic fallback matching project specifics
    return [
      {
        prompt: `How impressive was your initial impression of ${project.name}?`,
        description: 'Rate visual design, presentation, and clarity.',
        questionType: 'rating',
        isRequired: true,
        sortOrder: 1,
        minLabel: 'Poor',
        maxLabel: 'Outstanding'
      },
      {
        prompt: 'How easily were you able to understand what problem this project solves?',
        questionType: 'likert',
        isRequired: true,
        sortOrder: 2,
        minLabel: 'Very Confusing',
        maxLabel: 'Immediately Clear'
      },
      {
        prompt: 'How smooth and responsive was the user navigation on your device?',
        questionType: 'likert',
        isRequired: true,
        sortOrder: 3,
        minLabel: 'Clunky / Broken',
        maxLabel: 'Effortless'
      },
      {
        prompt: 'Did you experience any layout cutoff, broken links, or visual glitches?',
        questionType: 'yes_no',
        isRequired: true,
        sortOrder: 4
      },
      {
        prompt: 'Which aspect of the project was most appealing to you?',
        questionType: 'multiple_choice',
        isRequired: false,
        sortOrder: 5,
        options: [
          { label: 'Innovative concept & idea', value: 'idea', sortOrder: 1 },
          { label: 'Technical depth & complexity', value: 'tech', sortOrder: 2 },
          { label: 'UI/UX Polish and feel', value: 'ui', sortOrder: 3 },
          { label: 'Real-world practical utility', value: 'utility', sortOrder: 4 }
        ]
      },
      {
        prompt: 'What was the single biggest friction point or bug you noticed while testing?',
        questionType: 'long_text',
        isRequired: true,
        sortOrder: 6
      },
      {
        prompt: 'What feature or improvement would you recommend before final judging?',
        questionType: 'short_text',
        isRequired: false,
        sortOrder: 7
      },
      {
        prompt: 'How likely are you to vote for or recommend this hackathon submission? (NPS)',
        questionType: 'nps',
        isRequired: true,
        sortOrder: 8,
        minLabel: '0 - Not likely',
        maxLabel: '10 - Extremely likely'
      },
      {
        prompt: 'Overall experience rating:',
        questionType: 'emoji_rating',
        isRequired: true,
        sortOrder: 9
      }
    ];
  }
}
