import * as cheerio from 'cheerio';
import { URLSafetyService } from '../security/URLSafetyService.js';

export interface InspectionResult {
  url: string;
  statusCode: number;
  responseTimeMs: number;
  redirectChain: string[];
  resolvedIps: string[];
  headers: Record<string, string | string[] | undefined>;
  title: string;
  hasViewportMeta: boolean;
  viewportContent?: string;
  internalLinks: string[];
  externalLinks: string[];
  images: Array<{ src: string; alt?: string }>;
  scripts: Array<{ src?: string; isInline: boolean }>;
  stylesheets: string[];
  forms: Array<{ action?: string; method?: string; inputsCount: number; hasMissingLabels: boolean }>;
  headings: { h1Count: number; h2Count: number; h3Count: number };
  rawHtmlSnippet: string;
}

export class WebsiteInspectionAgent {
  public static async inspect(targetUrl: string): Promise<InspectionResult> {
    // Perform safe, SSRF-protected fetch
    const fetchRes = await URLSafetyService.safeFetch(targetUrl);
    const $ = cheerio.load(fetchRes.body);

    const title = $('title').first().text().trim() || 'Untitled Page';

    // Viewport meta
    const viewportTag = $('meta[name="viewport"]');
    const hasViewportMeta = viewportTag.length > 0;
    const viewportContent = viewportTag.attr('content');

    // Links
    const internalLinks: string[] = [];
    const externalLinks: string[] = [];
    const parsedBase = new URL(fetchRes.finalUrl);

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

      try {
        const resolved = new URL(href, fetchRes.finalUrl);
        if (resolved.hostname === parsedBase.hostname) {
          internalLinks.push(resolved.toString());
        } else {
          externalLinks.push(resolved.toString());
        }
      } catch {
        // Invalid URL format in link
      }
    });

    // Images
    const images: Array<{ src: string; alt?: string }> = [];
    $('img').each((_, el) => {
      const src = $(el).attr('src') || '';
      const alt = $(el).attr('alt');
      images.push({ src, alt });
    });

    // Scripts
    const scripts: Array<{ src?: string; isInline: boolean }> = [];
    $('script').each((_, el) => {
      const src = $(el).attr('src');
      scripts.push({ src, isInline: !src });
    });

    // Stylesheets
    const stylesheets: string[] = [];
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) stylesheets.push(href);
    });

    // Forms & Labels
    const forms: Array<{ action?: string; method?: string; inputsCount: number; hasMissingLabels: boolean }> = [];
    $('form').each((_, el) => {
      const formEl = $(el);
      const inputs = formEl.find('input, textarea, select');
      let missingLabels = false;

      inputs.each((__, inputEl) => {
        const type = $(inputEl).attr('type');
        if (type === 'hidden' || type === 'submit' || type === 'button') return;
        const id = $(inputEl).attr('id');
        const ariaLabel = $(inputEl).attr('aria-label');
        const ariaLabelledby = $(inputEl).attr('aria-labelledby');

        let hasLabel = false;
        if (ariaLabel || ariaLabelledby) {
          hasLabel = true;
        } else if (id && $(`label[for="${id}"]`).length > 0) {
          hasLabel = true;
        } else if ($(inputEl).closest('label').length > 0) {
          hasLabel = true;
        }

        if (!hasLabel) missingLabels = true;
      });

      forms.push({
        action: formEl.attr('action'),
        method: formEl.attr('method') || 'GET',
        inputsCount: inputs.length,
        hasMissingLabels: missingLabels
      });
    });

    // Headings
    const headings = {
      h1Count: $('h1').length,
      h2Count: $('h2').length,
      h3Count: $('h3').length
    };

    return {
      url: fetchRes.finalUrl,
      statusCode: fetchRes.statusCode,
      responseTimeMs: fetchRes.responseTimeMs,
      redirectChain: fetchRes.redirectChain,
      resolvedIps: fetchRes.resolvedIps,
      headers: fetchRes.headers,
      title,
      hasViewportMeta,
      viewportContent,
      internalLinks: Array.from(new Set(internalLinks)).slice(0, 50),
      externalLinks: Array.from(new Set(externalLinks)).slice(0, 50),
      images: images.slice(0, 50),
      scripts: scripts.slice(0, 50),
      stylesheets: stylesheets.slice(0, 20),
      forms,
      headings,
      rawHtmlSnippet: fetchRes.body.substring(0, 2000)
    };
  }
}
