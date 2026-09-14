import { z } from 'zod';
import { DbProject } from '../models/db.js';
import { getAIProvider } from '../providers/AIProvider.js';
import { PromptSanitizer } from '../security/PromptSanitizer.js';

export const ProjectProfileSchema = z.object({
  summary: z.string(),
  coreFlows: z.array(z.string()),
  keyPersonas: z.array(z.string()),
  riskPoints: z.array(z.string())
});

export type ProjectProfile = z.infer<typeof ProjectProfileSchema>;

export class ProjectUnderstandingAgent {
  public static async analyze(project: DbProject): Promise<ProjectProfile> {
    const ai = getAIProvider();

    const systemPrompt = `You are Agent 1: ProjectUnderstandingAgent for hackathon evaluations.
Analyze the project description, event information, and technology stack.
Produce a structured JSON summary identifying the core user journeys, target personas, and potential architectural or quality risk points.`;

    const userPrompt = `Project Name: ${project.name}
Event: ${project.eventName} (${project.eventType || 'Hackathon'})
Category: ${project.category}
Short Description: ${PromptSanitizer.sanitizeUntrusted(project.shortDescription, 'project_short_desc')}
Detailed Description: ${PromptSanitizer.sanitizeUntrusted(project.detailedDescription || 'N/A', 'project_detailed_desc')}
Problem: ${PromptSanitizer.sanitizeUntrusted(project.problemStatement || 'N/A', 'project_problem')}
Solution: ${PromptSanitizer.sanitizeUntrusted(project.solution || 'N/A', 'project_solution')}
Technologies: Frontend: ${project.techFrontend || 'N/A'}, Backend: ${project.techBackend || 'N/A'}, Database: ${project.techDatabase || 'N/A'}, AI: ${project.techAi || 'N/A'}
Feedback Goal: ${project.feedbackGoal}`;

    return await ai.generateStructured<ProjectProfile>({
      systemPrompt,
      userPrompt,
      responseSchema: ProjectProfileSchema
    });
  }
}
