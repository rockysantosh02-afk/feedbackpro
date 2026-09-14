import { z } from 'zod';
import { DbProject } from '../models/db.js';
import { getAIProvider } from '../providers/AIProvider.js';
import { PromptSanitizer } from '../security/PromptSanitizer.js';
import { RawFinding } from './BugDetectionAgent.js';
import { ProjectProfile } from './ProjectUnderstandingAgent.js';

export const StrategyResultSchema = z.object({
  objective: z.string(),
  focusAreas: z.array(z.string()),
  unbiasedAngle: z.string()
});

export type FeedbackStrategy = z.infer<typeof StrategyResultSchema>;

export class FeedbackStrategyAgent {
  public static async plan(
    project: DbProject,
    profile: ProjectProfile,
    findings: RawFinding[]
  ): Promise<FeedbackStrategy> {
    const ai = getAIProvider();

    const systemPrompt = `You are Agent 6: FeedbackStrategyAgent.
Formulate a strategy for surveying hackathon attendees, judges, and mentors about this project.
CRITICAL MANDATE: Never reveal private technical audit findings to respondents in a way that biases their feedback.
Instead, craft objective angles that neutrally validate real user experience in potential problem areas.`;

    const userPrompt = `Project: ${project.name}
Category: ${project.category}
Goal: ${project.feedbackGoal}
Target Users: ${project.targetUsers || 'Hackathon audience'}
Technical Defect Categories Observed: ${Array.from(new Set(findings.map((f) => f.category))).join(', ')}
Summary: ${PromptSanitizer.sanitizeUntrusted(profile.summary, 'profile_summary')}`;

    try {
      return await ai.generateStructured<FeedbackStrategy>({
        systemPrompt,
        userPrompt,
        responseSchema: StrategyResultSchema
      });
    } catch {
      return {
        objective: `Collect actionable hackathon feedback tailored to ${project.feedbackGoal}`,
        focusAreas: ['First impression & aesthetic design', 'Clarity of value proposition', 'Usability and ease of navigation', 'Willingness to adopt or vote'],
        unbiasedAngle: 'Neutral inquiry covering experience, layout comfort, and feature excitement without biasing tester opinions.'
      };
    }
  }
}
