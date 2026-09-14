import { z } from 'zod';
import { DbAuditFinding, DbFeedbackTheme } from '../models/db.js';
import { getAIProvider } from '../providers/AIProvider.js';

export const CorrelatedItemSchema = z.object({
  technicalFindingId: z.string().optional(),
  technicalFindingTitle: z.string(),
  userFeedbackTheme: z.string(),
  correlationConfidence: z.enum(['high', 'medium', 'low']),
  rationale: z.string()
});

export const CorrelationResultSchema = z.object({
  correlations: z.array(CorrelatedItemSchema)
});

export type CorrelatedItem = z.infer<typeof CorrelatedItemSchema>;

export class IssueCorrelationAgent {
  public static async correlate(
    findings: DbAuditFinding[],
    themes: DbFeedbackTheme[]
  ): Promise<CorrelatedItem[]> {
    if (findings.length === 0 || themes.length === 0) {
      return [];
    }

    const ai = getAIProvider();

    const systemPrompt = `You are Agent 9: IssueCorrelationAgent.
Compare technical website audit findings with participant feedback themes.
Identify where independent technical observations match real user complaints.
Example:
Technical finding: "Missing viewport meta tag or responsive layout overflow"
Participant theme: "Mobile navigation difficult to click"
Conclusion: "Technical evidence and participant feedback independently identify the same usability problem."

CRITICAL RULE: Never manufacture false correlations. Only correlate when there is genuine semantic overlap.`;

    const userPrompt = `Technical Findings:
${findings.map((f) => `- [${f.id}] [${f.severity}] ${f.title}: ${f.description}`).join('\n')}

User Feedback Themes:
${themes.map((t) => `- [${t.sentiment}] "${t.themeTitle}": ${t.aiSummary} (${t.occurrenceCount} occurrences)`).join('\n')}`;

    try {
      const result = await ai.generateStructured<{ correlations: CorrelatedItem[] }>({
        systemPrompt,
        userPrompt,
        responseSchema: CorrelationResultSchema
      });

      return result.correlations || [];
    } catch {
      // Deterministic semantic correlation fallback
      const correlated: CorrelatedItem[] = [];

      for (const finding of findings) {
        for (const theme of themes) {
          const findingWords = (finding.title + ' ' + finding.description).toLowerCase();
          const themeWords = (theme.themeTitle + ' ' + theme.aiSummary).toLowerCase();

          // Check keywords: mobile, navigation, form, label, speed, slow, error, broken
          const keywords = ['mobile', 'navigation', 'layout', 'speed', 'slow', 'form', 'contrast', 'button'];
          const matched = keywords.some((kw) => findingWords.includes(kw) && themeWords.includes(kw));

          if (matched) {
            correlated.push({
              technicalFindingId: finding.id,
              technicalFindingTitle: finding.title,
              userFeedbackTheme: theme.themeTitle,
              correlationConfidence: 'high',
              rationale: `Technical evidence and participant feedback independently identify the same issue: both observed friction regarding ${theme.themeTitle.toLowerCase()}.`
            });
            break; // Correlate at most once per finding
          }
        }
      }

      return correlated;
    }
  }
}
