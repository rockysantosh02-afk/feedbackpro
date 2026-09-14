import { z } from 'zod';
import { getAIProvider } from '../providers/AIProvider.js';
import { PromptSanitizer } from '../security/PromptSanitizer.js';
import { InspectionResult } from './WebsiteInspectionAgent.js';

export const FindingSchema = z.object({
  title: z.string(),
  category: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  confidence: z.enum(['high', 'medium', 'low']),
  verified: z.boolean(),
  description: z.string(),
  evidence: z.string(),
  affectedUrl: z.string(),
  recommendedFix: z.string(),
  source: z.enum(['scanner', 'browser', 'ai'])
});

export const BugDetectionResultSchema = z.object({
  findings: z.array(FindingSchema)
});

export type RawFinding = z.infer<typeof FindingSchema>;

export class BugDetectionAgent {
  public static async analyze(inspection: InspectionResult): Promise<RawFinding[]> {
    const findings: RawFinding[] = [];

    // Deterministic Rule 1: HTTP Status Error
    if (inspection.statusCode >= 400) {
      findings.push({
        title: `HTTP Server Error (${inspection.statusCode})`,
        category: 'Functional',
        severity: inspection.statusCode >= 500 ? 'critical' : 'high',
        confidence: 'high',
        verified: true,
        description: `The root target page returned HTTP status code ${inspection.statusCode}.`,
        evidence: `HTTP Status Code: ${inspection.statusCode} on URL: ${inspection.url}`,
        affectedUrl: inspection.url,
        recommendedFix: 'Ensure your server routes and reverse proxy are correctly configured and running without crashes.',
        source: 'scanner'
      });
    }

    // Deterministic Rule 2: Page Response Time / Performance
    if (inspection.responseTimeMs > 3500) {
      findings.push({
        title: 'High Initial Server Response Latency',
        category: 'Performance',
        severity: 'medium',
        confidence: 'high',
        verified: true,
        description: `Initial Time-to-First-Byte (TTFB) / download took ${inspection.responseTimeMs}ms, exceeding the 3000ms threshold.`,
        evidence: `Measured response latency: ${inspection.responseTimeMs}ms`,
        affectedUrl: inspection.url,
        recommendedFix: 'Optimize server cold start, enable gzip/brotli compression, or implement CDN edge caching.',
        source: 'scanner'
      });
    }

    // Deterministic Rule 3: Missing Form Labels (Accessibility / Forms)
    const formsWithMissingLabels = inspection.forms.filter((f) => f.hasMissingLabels);
    if (formsWithMissingLabels.length > 0) {
      findings.push({
        title: 'Form Input Elements Missing Accessible Labels',
        category: 'Forms',
        severity: 'medium',
        confidence: 'high',
        verified: true,
        description: `${formsWithMissingLabels.length} form(s) contain inputs lacking semantic <label> tags or aria-label attributes.`,
        evidence: `Inspected form inputs: ${inspection.forms.map((f) => `method=${f.method}, inputs=${f.inputsCount}`).join('; ')}`,
        affectedUrl: inspection.url,
        recommendedFix: 'Associate a <label for="inputId"> with each input element or supply an aria-label attribute.',
        source: 'scanner'
      });
    }

    // Deterministic Rule 4: Heading Hierarchy
    if (inspection.headings.h1Count === 0) {
      findings.push({
        title: 'Missing Primary Page Heading (<h1>)',
        category: 'Accessibility',
        severity: 'low',
        confidence: 'high',
        verified: true,
        description: 'The page has no <h1> element, impairing screen reader structure and document semantics.',
        evidence: `Heading count: <h1>=${inspection.headings.h1Count}, <h2>=${inspection.headings.h2Count}, <h3>=${inspection.headings.h3Count}`,
        affectedUrl: inspection.url,
        recommendedFix: 'Add a single, descriptive <h1> element representing the main page purpose.',
        source: 'scanner'
      });
    } else if (inspection.headings.h1Count > 1) {
      findings.push({
        title: 'Multiple <h1> Headings Detected',
        category: 'Accessibility',
        severity: 'info',
        confidence: 'high',
        verified: true,
        description: `Found ${inspection.headings.h1Count} <h1> headings. Standard HTML5 accessibility best practice recommends one primary <h1> per document.`,
        evidence: `Found ${inspection.headings.h1Count} <h1> tags in DOM`,
        affectedUrl: inspection.url,
        recommendedFix: 'Use one <h1> for the main title and structure sub-sections with <h2> and <h3> tags.',
        source: 'scanner'
      });
    }

    // AI-driven bug classification for complex semantic issues
    try {
      const ai = getAIProvider();
      const systemPrompt = `You are Agent 3: BugDetectionAgent.
Analyze the provided public website inspection data.
Identify any observable functional, layout, or semantic bugs.
CRITICAL RULE: Never hallucinate or claim an issue exists without concrete evidence.
Return a structured JSON object with an array of "findings".`;

      const userPrompt = `Inspected URL: ${inspection.url}
Title: ${inspection.title}
Status Code: ${inspection.statusCode}
Response Time: ${inspection.responseTimeMs}ms
Viewport Meta: ${inspection.hasViewportMeta ? inspection.viewportContent : 'MISSING'}
Internal Links Count: ${inspection.internalLinks.length}
External Links Count: ${inspection.externalLinks.length}
Images Count: ${inspection.images.length}
Forms Count: ${inspection.forms.length}
DOM Snippet:
${PromptSanitizer.sanitizeUntrusted(inspection.rawHtmlSnippet, 'html_dom_snippet')}`;

      const aiResult = await ai.generateStructured<{ findings: RawFinding[] }>({
        systemPrompt,
        userPrompt,
        responseSchema: BugDetectionResultSchema
      });

      if (aiResult && Array.isArray(aiResult.findings)) {
        for (const item of aiResult.findings) {
          // Verify that item does not duplicate existing deterministic finding
          if (!findings.some((f) => f.title.toLowerCase() === item.title.toLowerCase())) {
            findings.push(item);
          }
        }
      }
    } catch {
      // Fallback relies on deterministic scanner findings
    }

    return findings;
  }
}
