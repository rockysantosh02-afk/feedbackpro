import { promises as dns } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

export interface URLSafetyResult {
  isSafe: boolean;
  normalizedUrl?: string;
  resolvedIps?: string[];
  errorMessage?: string;
}

export interface SafeFetchResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  finalUrl: string;
  redirectChain: string[];
  resolvedIps: string[];
  responseTimeMs: number;
}

export class URLSafetyService {
  private static readonly MAX_REDIRECTS = 5;
  private static readonly CONNECT_TIMEOUT_MS = 5000;
  private static readonly READ_TIMEOUT_MS = 10000;
  private static readonly MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB

  private static readonly BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'metadata.google.internal',
    'metadata',
    'instance-data',
    'docker.for.win.localhost',
    'docker.for.mac.localhost',
    'host.docker.internal'
  ]);

  /**
   * Layer 1 & 2 & 3: Validates a URL against strict SSRF, protocol, and IP constraints.
   */
  public static async validateUrl(inputUrl: string): Promise<URLSafetyResult> {
    if (!inputUrl || typeof inputUrl !== 'string') {
      return { isSafe: false, errorMessage: 'URL must be a non-empty string' };
    }

    if (inputUrl.length > 2048) {
      return { isSafe: false, errorMessage: 'URL exceeds maximum length of 2048 characters' };
    }

    let parsed: URL;
    try {
      parsed = new URL(inputUrl);
    } catch {
      return { isSafe: false, errorMessage: 'Invalid URL format' };
    }

    // Layer 1: Protocol enforcement
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        isSafe: false,
        errorMessage: `Prohibited protocol: '${parsed.protocol}'. Only http: and https: are permitted.`
      };
    }

    // Block user/password in URL to prevent basic-auth smuggling
    if (parsed.username || parsed.password) {
      return { isSafe: false, errorMessage: 'Embedded credentials in URLs are prohibited' };
    }

    const hostname = parsed.hostname.toLowerCase().trim();

    if (!hostname || hostname.length === 0) {
      return { isSafe: false, errorMessage: 'URL hostname cannot be empty' };
    }

    // Check blocked hostnames
    if (this.BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.internal') || hostname.endsWith('.local')) {
      return { isSafe: false, errorMessage: `Blocked hostname '${hostname}'` };
    }

    // If hostname is directly an IP literal or needs resolution
    let resolvedIps: string[] = [];
    try {
      // Layer 2: Resolve ALL A and AAAA records
      const lookups = await dns.lookup(hostname, { all: true });
      if (!lookups || lookups.length === 0) {
        return { isSafe: false, errorMessage: `Could not resolve hostname '${hostname}'` };
      }
      resolvedIps = lookups.map((l) => l.address);
    } catch (err: any) {
      return {
        isSafe: false,
        errorMessage: `DNS resolution failed for '${hostname}': ${err.message || 'unknown error'}`
      };
    }

    // Layer 3: Inspect ALL resolved IP addresses
    for (const ip of resolvedIps) {
      const check = this.classifyIp(ip);
      if (!check.isSafe) {
        return {
          isSafe: false,
          resolvedIps,
          errorMessage: `Resolved IP '${ip}' for host '${hostname}' is prohibited: ${check.reason}`
        };
      }
    }

    return {
      isSafe: true,
      normalizedUrl: parsed.toString(),
      resolvedIps
    };
  }

  /**
   * Classifies an IP address against forbidden ranges (private, loopback, link-local, cloud metadata, multicast).
   */
  public static classifyIp(ip: string): { isSafe: boolean; reason?: string } {
    // Check IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
    if (ip.startsWith('::ffff:')) {
      const ipv4Part = ip.substring(7);
      if (ipv4Part.includes('.')) {
        return this.classifyIpv4(ipv4Part);
      }
    }

    if (ip.includes(':')) {
      return this.classifyIpv6(ip);
    }

    return this.classifyIpv4(ip);
  }

  private static classifyIpv4(ip: string): { isSafe: boolean; reason?: string } {
    const parts = ip.split('.').map((p) => Number.parseInt(p, 10));
    if (parts.length !== 4 || parts.some(isNaN) || parts.some((p) => p < 0 || p > 255)) {
      return { isSafe: false, reason: 'Malformed IPv4 address' };
    }

    const [a, b] = parts;

    // 0.0.0.0/8 (Current network)
    if (a === 0) return { isSafe: false, reason: 'Current network (0.0.0.0/8)' };

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return { isSafe: false, reason: 'Loopback address (127.0.0.0/8)' };

    // 10.0.0.0/8 (Private)
    if (a === 10) return { isSafe: false, reason: 'Private IP range (10.0.0.0/8)' };

    // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return { isSafe: false, reason: 'Private IP range (172.16.0.0/12)' };

    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return { isSafe: false, reason: 'Private IP range (192.168.0.0/16)' };

    // 169.254.0.0/16 (Link-local & Cloud metadata: 169.254.169.254)
    if (a === 169 && b === 254) return { isSafe: false, reason: 'Link-local / Cloud metadata range (169.254.0.0/16)' };

    // 224.0.0.0/4 (Multicast)
    if (a >= 224 && a <= 239) return { isSafe: false, reason: 'Multicast address (224.0.0.0/4)' };

    // 240.0.0.0/4 (Reserved) & 255.255.255.255 (Broadcast)
    if (a >= 240) return { isSafe: false, reason: 'Reserved/Broadcast address' };

    return { isSafe: true };
  }

  private static classifyIpv6(ip: string): { isSafe: boolean; reason?: string } {
    const normalized = ip.toLowerCase();

    // Loopback
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') {
      return { isSafe: false, reason: 'IPv6 loopback (::1)' };
    }

    // Unspecified
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') {
      return { isSafe: false, reason: 'IPv6 unspecified (::)' };
    }

    // Link-local: fe80::/10 (starts with fe8, fe9, fea, feb)
    if (/^fe[89ab]/i.test(normalized)) {
      return { isSafe: false, reason: 'IPv6 link-local (fe80::/10)' };
    }

    // Unique Local: fc00::/7 (starts with fc or fd)
    if (/^f[cd]/i.test(normalized)) {
      return { isSafe: false, reason: 'IPv6 unique local (fc00::/7)' };
    }

    return { isSafe: true };
  }

  /**
   * Safe fetch performing Layer 4 (safe redirects), Layer 5 (re-verification), and Layer 6 (limits).
   */
  public static async safeFetch(initialUrl: string): Promise<SafeFetchResponse> {
    let currentUrl = initialUrl;
    const redirectChain: string[] = [];
    const allResolvedIps: string[] = [];
    const startTime = Date.now();

    for (let hop = 0; hop <= this.MAX_REDIRECTS; hop++) {
      // Validate each step in the redirect chain before fetching
      const safety = await this.validateUrl(currentUrl);
      if (!safety.isSafe) {
        throw new Error(`SSRF Prevention: ${safety.errorMessage || 'Blocked destination'}`);
      }

      if (safety.resolvedIps) {
        allResolvedIps.push(...safety.resolvedIps);
      }

      redirectChain.push(currentUrl);

      const res = await this.executeSingleRequest(currentUrl);

      // Handle Redirects (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        if (hop === this.MAX_REDIRECTS) {
          throw new Error(`Exceeded maximum redirect limit of ${this.MAX_REDIRECTS}`);
        }

        const rawLocation = Array.isArray(res.headers.location)
          ? res.headers.location[0]
          : res.headers.location;

        const nextUrl = new URL(rawLocation, currentUrl).toString();
        currentUrl = nextUrl;
        continue;
      }

      // Final response reached
      return {
        statusCode: res.statusCode,
        headers: res.headers,
        body: res.body,
        finalUrl: currentUrl,
        redirectChain,
        resolvedIps: Array.from(new Set(allResolvedIps)),
        responseTimeMs: Date.now() - startTime
      };
    }

    throw new Error('Unexpected redirect handling failure');
  }

  private static executeSingleRequest(
    targetUrl: string
  ): Promise<{ statusCode: number; headers: Record<string, string | string[] | undefined>; body: string }> {
    return new Promise((resolve, reject) => {
      const parsed = new URL(targetUrl);
      const isHttps = parsed.protocol === 'https:';
      const client = isHttps ? https : http;

      let settled = false;

      const req = client.request(
        targetUrl,
        {
          method: 'GET',
          headers: {
            'User-Agent': 'FeedbackPro-Auditor/1.0 (+https://feedbackpro.ai; responsible-auditor)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'close'
          },
          timeout: this.CONNECT_TIMEOUT_MS
        },
        (res) => {
          let totalBytes = 0;
          const chunks: Buffer[] = [];

          res.setTimeout(this.READ_TIMEOUT_MS, () => {
            if (!settled) {
              settled = true;
              req.destroy();
              reject(new Error('Response read timeout exceeded'));
            }
          });

          res.on('data', (chunk: Buffer) => {
            totalBytes += chunk.length;
            if (totalBytes > this.MAX_RESPONSE_BYTES) {
              if (!settled) {
                settled = true;
                req.destroy();
                reject(new Error(`Response size exceeded maximum limit of ${this.MAX_RESPONSE_BYTES} bytes`));
              }
              return;
            }
            chunks.push(chunk);
          });

          res.on('end', () => {
            if (!settled) {
              settled = true;
              const body = Buffer.concat(chunks).toString('utf-8');
              resolve({
                statusCode: res.statusCode || 0,
                headers: res.headers,
                body
              });
            }
          });
        }
      );

      req.on('timeout', () => {
        if (!settled) {
          settled = true;
          req.destroy();
          reject(new Error('Connection timeout exceeded'));
        }
      });

      req.on('error', (err) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      });

      req.end();
    });
  }
}
