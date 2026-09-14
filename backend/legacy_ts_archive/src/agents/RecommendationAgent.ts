import { z } from 'zod';
import { DbAuditFinding, DbProject } from '../models/db.js';
import { getAIProvider } from '../providers/AIProvider.js';
import { CorrelatedItem } from './IssueCorrelationAgent.js';

export const RecommendationItemSchema = z.object({
  priority: z.enum(['P0', 'P1', 'P2', 'P3']),
  title: z.string(),
  problemStatement: z.string(),
  whyItMatters: z.string(),
  remediationSteps: z.array(z.string()),
  rationale: z.string(),
  correlatedFindingId: z.string().optional(),
  correlatedFeedbackCount: z.number().default(0),
  easeOfFixing: z.enum(['Easy', 'Medium', 'Hard'])
});

export const RecommendationResultSchema = z.object({
  recommendations: z.array(RecommendationItemSchema)
});

export type PrioritizedRecommendation = z.infer<typeof RecommendationItemSchema>;

export class RecommendationAgent {
  public static async prioritize(
    project: DbProject,
    findings: DbAuditFinding[],
    correlations: CorrelatedItem[]
  ): Promise<PrioritizedRecommendation[]> {
    const ai = getAIProvider();

    const systemPrompt = `You are Agent 10: RecommendationAgent.
Produce a prioritized remediation action plan for the hackathon team.
Categories:
- P0: Critical blocker / security defect / major crash
- P1: High-impact bug / corroborated user complaint / broken primary flow
- P2: Important improvement (accessibility, SEO, noticeable UI friction)
- P3: Nice-to-have polish

Format each item with:
- Priority (P0, P1, P2, P3)
- Clear Title
- WHAT'S WRONG (problemStatement)
- WHY IT MATTERS (whyItMatters)
- HOW TO FIX (remediationSteps array with actionable steps)
- RATIONALE (rationale explaining why it received this priority level)
- Ease of fixing (Easy, Medium, Hard)`;

    const userPrompt = `Project: ${project.name} (${project.category})
Technical Findings:
${findings.map((f) => `- [${f.severity}] ${f.title}: ${f.description}. Fix: ${f.recommendedFix}`).join('\n')}

Correlated Findings (Validated by Users):
${correlations.map((c) => `- "${c.technicalFindingTitle}" matched "${c.userFeedbackTheme}": ${c.rationale}`).join('\n')}`;

    try {
      const result = await ai.generateStructured<{ recommendations: PrioritizedRecommendation[] }>({
        systemPrompt,
        userPrompt,
        responseSchema: RecommendationResultSchema
      });

      return result.recommendations.sort((a, b) => a.priority.localeCompare(b.priority));
    } catch {
      // Deterministic priority engine fallback
      const list: PrioritizedRecommendation[] = [];

      // Check for P0 (critical severity or critical security)
      for (const f of findings) {
        if (f.severity === 'critical') {
          list.push({
            priority: 'P0',
            title: `Resolve Critical Issue: ${f.title}`,
            problemStatement: f.description,
            whyItMatters: 'Critical defects crash the application or expose sensitive infrastructure during live demos.',
            remediationSteps: [f.recommendedFix, 'Deploy to staging and verify with fresh browser cache'],
            rationale: 'Classified as P0 due to Critical severity level in passive inspection.',
            correlatedFindingId: f.id,
            correlatedFeedbackCount: 0,
            easeOfFixing: 'Medium'
          });
        }
      }

      // Check for Correlated issues (automatically promoted to P1)
      for (const c of correlations) {
        list.push({
          priority: 'P1',
          title: `Fix User-Impacting Issue: ${c.technicalFindingTitle}`,
          problemStatement: `Technical crawler identified layout or functional friction that was independently reported by multiple participants.`,
          whyItMatters: 'Judges and hackathon users directly notice this flaw, negatively impacting evaluation scores.',
          remediationSteps: [
            'Inspect affected responsive breakpoints or component layout',
            'Verify interactive hit targets are at least 44x44px',
            'Test on both mobile Safari/Chrome and desktop viewports'
          ],
          rationale: `Promoted to P1 because technical finding was independently corroborated by real user feedback: "${c.userFeedbackTheme}".`,
          correlatedFindingId: c.technicalFindingId,
          correlatedFeedbackCount: 3,
          easeOfFixing: 'Easy'
        });
      }

      // Check High severity findings
      for (const f of findings) {
        if (f.severity === 'high' && !list.some((i) => i.title.includes(f.title))) {
          list.push({
            priority: 'P1',
            title: f.title,
            problemStatement: f.description,
            whyItMatters: 'High-severity issues degrade trust and reliability for evaluating judges.',
            remediationSteps: [f.recommendedFix],
            rationale: 'Classified as P1 due to high severity classification.',
            correlatedFindingId: f.id,
            correlatedFeedbackCount: 0,
            easeOfFixing: 'Medium'
          });
        }
      }

      // Add P2 for Accessibility/UX
      for (const f of findings) {
        if ((f.severity === 'medium' || f.category === 'Accessibility' || f.category === 'Forms') && !list.some((i) => i.title.includes(f.title))) {
          list.push({
            priority: 'P2',
            title: f.title,
            problemStatement: f.description,
            whyItMatters: 'Accessibility and form polish distinguish top hackathon projects from average submissions.',
            remediationSteps: [f.recommendedFix],
            rationale: 'Classified as P2 for usability and accessibility compliance.',
            correlatedFindingId: f.id,
            correlatedFeedbackCount: 0,
            easeOfFixing: 'Easy'
          });
        }
      }

      return list.sort((a, b) => a.priority.localeCompare(b.priority));
    }
  }
}
