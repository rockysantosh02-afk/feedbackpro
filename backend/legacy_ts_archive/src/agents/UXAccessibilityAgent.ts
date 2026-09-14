import { RawFinding } from './BugDetectionAgent.js';
import { InspectionResult } from './WebsiteInspectionAgent.js';

export class UXAccessibilityAgent {
  public static analyze(inspection: InspectionResult): RawFinding[] {
    const findings: RawFinding[] = [];

    // 1. Mobile Viewport Meta Tag
    if (!inspection.hasViewportMeta) {
      findings.push({
        title: 'Missing Mobile Viewport Meta Tag',
        category: 'Accessibility',
        severity: 'high',
        confidence: 'high',
        verified: true,
        description: 'The document does not include a <meta name="viewport"> tag, causing mobile browsers to render a desktop-width viewport.',
        evidence: 'No <meta name="viewport"> tag detected in <head>.',
        affectedUrl: inspection.url,
        recommendedFix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> inside the <head> element.',
        source: 'scanner'
      });
    } else if (inspection.viewportContent && inspection.viewportContent.includes('user-scalable=no')) {
      findings.push({
        title: 'Pinch-to-Zoom Disabled (user-scalable=no)',
        category: 'Accessibility',
        severity: 'medium',
        confidence: 'high',
        verified: true,
        description: 'The viewport meta tag disables pinch-to-zoom, which violates accessibility standards for low-vision users.',
        evidence: `Viewport content: "${inspection.viewportContent}"`,
        affectedUrl: inspection.url,
        recommendedFix: 'Remove user-scalable=no and maximum-scale=1 from the viewport meta tag.',
        source: 'scanner'
      });
    }

    // 2. Images Missing Alt Text
    const imagesMissingAlt = inspection.images.filter((img) => img.alt === undefined || img.alt === null);
    if (imagesMissingAlt.length > 0) {
      findings.push({
        title: 'Images Missing Alternative Text (alt attribute)',
        category: 'Accessibility',
        severity: 'medium',
        confidence: 'high',
        verified: true,
        description: `${imagesMissingAlt.length} image(s) lack an alt attribute, making them inaccessible to screen reader users.`,
        evidence: `Sample images missing alt: ${imagesMissingAlt.slice(0, 3).map((img) => img.src || 'unnamed').join(', ')}`,
        affectedUrl: inspection.url,
        recommendedFix: 'Provide meaningful alt descriptions for informative images, or alt="" for purely decorative graphics.',
        source: 'scanner'
      });
    }

    // 3. Document Title Presence
    if (!inspection.title || inspection.title === 'Untitled Page') {
      findings.push({
        title: 'Missing or Generic Document <title>',
        category: 'UX',
        severity: 'low',
        confidence: 'high',
        verified: true,
        description: 'The page title is missing or set to a default generic placeholder.',
        evidence: `Document title: "${inspection.title}"`,
        affectedUrl: inspection.url,
        recommendedFix: 'Add a concise, descriptive <title> identifying the project name and page context.',
        source: 'scanner'
      });
    }

    return findings;
  }
}
