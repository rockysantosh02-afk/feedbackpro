import { RawFinding } from './BugDetectionAgent.js';
import { InspectionResult } from './WebsiteInspectionAgent.js';

export class SecurityPostureAgent {
  public static analyze(inspection: InspectionResult): RawFinding[] {
    const findings: RawFinding[] = [];
    const headers = inspection.headers;
    const urlObj = new URL(inspection.url);

    // 1. HTTPS Protocol Check
    if (urlObj.protocol === 'http:') {
      findings.push({
        title: 'Insecure Transport (HTTP)',
        category: 'Security posture',
        severity: 'high',
        confidence: 'high',
        verified: true,
        description: 'The target website is served over insecure HTTP without TLS encryption.',
        evidence: `URL protocol is '${urlObj.protocol}'. Sensitive user inputs or session cookies could be intercepted over unencrypted networks.`,
        affectedUrl: inspection.url,
        recommendedFix: 'Obtain an SSL/TLS certificate (e.g. via Let\'s Encrypt or Render/Cloudflare) and redirect all HTTP traffic to HTTPS.',
        source: 'scanner'
      });
    }

    // 2. Strict-Transport-Security (HSTS) Header
    const hsts = headers['strict-transport-security'];
    if (urlObj.protocol === 'https:' && !hsts) {
      findings.push({
        title: 'Missing HTTP Strict Transport Security (HSTS)',
        category: 'Security posture',
        severity: 'medium',
        confidence: 'high',
        verified: true,
        description: 'The Strict-Transport-Security header is not sent by the server.',
        evidence: 'Response headers do not contain "Strict-Transport-Security".',
        affectedUrl: inspection.url,
        recommendedFix: 'Add "Strict-Transport-Security: max-age=31536000; includeSubDomains" to web server headers.',
        source: 'scanner'
      });
    }

    // 3. Content-Security-Policy (CSP) Header
    const csp = headers['content-security-policy'];
    if (!csp) {
      findings.push({
        title: 'Missing Content-Security-Policy (CSP)',
        category: 'Security posture',
        severity: 'medium',
        confidence: 'high',
        verified: true,
        description: 'No Content-Security-Policy header detected on the response.',
        evidence: 'Response headers do not include "Content-Security-Policy".',
        affectedUrl: inspection.url,
        recommendedFix: 'Define a strong CSP header (e.g. default-src \'self\') to mitigate XSS and unauthorized data exfiltration.',
        source: 'scanner'
      });
    }

    // 4. X-Content-Type-Options Header
    const xcto = headers['x-content-type-options'];
    if (!xcto || String(xcto).toLowerCase() !== 'nosniff') {
      findings.push({
        title: 'Missing or Invalid X-Content-Type-Options',
        category: 'Security posture',
        severity: 'low',
        confidence: 'high',
        verified: true,
        description: 'The X-Content-Type-Options header is absent or not set to "nosniff".',
        evidence: `X-Content-Type-Options header value: ${xcto || 'MISSING'}`,
        affectedUrl: inspection.url,
        recommendedFix: 'Configure "X-Content-Type-Options: nosniff" on all responses to prevent MIME-sniffing attacks.',
        source: 'scanner'
      });
    }

    // 5. Clickjacking / Frame Protection (X-Frame-Options or CSP frame-ancestors)
    const xfo = headers['x-frame-options'];
    const hasFrameAncestors = csp && String(csp).includes('frame-ancestors');
    if (!xfo && !hasFrameAncestors) {
      findings.push({
        title: 'Missing Clickjacking Protection (X-Frame-Options)',
        category: 'Security posture',
        severity: 'medium',
        confidence: 'high',
        verified: true,
        description: 'Neither X-Frame-Options nor CSP frame-ancestors is configured to prevent clickjacking.',
        evidence: 'X-Frame-Options header is missing and CSP frame-ancestors directive was not detected.',
        affectedUrl: inspection.url,
        recommendedFix: 'Set "X-Frame-Options: DENY" or "X-Frame-Options: SAMEORIGIN" in HTTP response headers.',
        source: 'scanner'
      });
    }

    // 6. Referrer-Policy Header
    const referrerPolicy = headers['referrer-policy'];
    if (!referrerPolicy) {
      findings.push({
        title: 'Missing Referrer-Policy Header',
        category: 'Security posture',
        severity: 'low',
        confidence: 'high',
        verified: true,
        description: 'No Referrer-Policy is specified, potentially leaking sensitive query parameters in navigation headers.',
        evidence: 'Response headers do not include "Referrer-Policy".',
        affectedUrl: inspection.url,
        recommendedFix: 'Set "Referrer-Policy: strict-origin-when-cross-origin" or "no-referrer".',
        source: 'scanner'
      });
    }

    // 7. Permissive CORS Check
    const corsOrigin = headers['access-control-allow-origin'];
    const corsCreds = headers['access-control-allow-credentials'];
    if (corsOrigin === '*' && corsCreds === 'true') {
      findings.push({
        title: 'Overly Permissive CORS Configuration',
        category: 'Security posture',
        severity: 'high',
        confidence: 'high',
        verified: true,
        description: 'Access-Control-Allow-Origin is set to wildcard "*" while allow-credentials is enabled.',
        evidence: `Access-Control-Allow-Origin: ${corsOrigin}, Access-Control-Allow-Credentials: ${corsCreds}`,
        affectedUrl: inspection.url,
        recommendedFix: 'Specify explicit trusted origins in Access-Control-Allow-Origin instead of wildcard "*".',
        source: 'scanner'
      });
    }

    // 8. Public Secret / API Key Exposure in HTML
    const secretPatterns = [
      { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/g },
      { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{48}/g },
      { name: 'GitHub Personal Token', regex: /ghp_[0-9a-zA-Z]{36}/g },
      { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g }
    ];

    for (const pat of secretPatterns) {
      const match = inspection.rawHtmlSnippet.match(pat.regex);
      if (match) {
        findings.push({
          title: `Potential ${pat.name} Exposed in Public HTML`,
          category: 'Security posture',
          severity: 'critical',
          confidence: 'high',
          verified: true,
          description: `A credential string matching the signature of a ${pat.name} was detected in the publicly delivered page source.`,
          evidence: `Signature detected: ${match[0].substring(0, 8)}... (redacted)`,
          affectedUrl: inspection.url,
          recommendedFix: 'Immediately revoke the credential, move it to backend environment variables, and proxy requests through your server.',
          source: 'scanner'
        });
      }
    }

    return findings;
  }
}
