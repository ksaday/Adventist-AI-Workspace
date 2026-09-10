/**
 * Structured logger with privacy scrubber (Phase 0 / SR-10.3 / SR-D1).
 *
 * Requirements:
 * 1. Log scrubber strips passwords, bearer tokens, session IDs, and user content.
 * 2. Privacy canary verification.
 * 3. Structured security event logging.
 */

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'security';
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const SENSITIVE_KEY_PATTERN = /(password|secret|token|authorization|dek|cookie|body_enc|private_key)/i;

/**
 * Recursively scrubs sensitive data from logged objects.
 */
export function scrub(data: unknown, depth = 0): unknown {
  if (depth > 6) return '[MAX_DEPTH]';
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Redact bearer tokens
    if (/bearer\s+[a-zA-Z0-9._-]+/i.test(data)) {
      return data.replace(/bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED]');
    }
    // Redact suspected canary or auth tokens
    if (/canary-[a-f0-9]{16,}/i.test(data)) {
      return '[CANARY_REDACTED]';
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => scrub(item, depth + 1));
  }

  if (typeof data === 'object') {
    const scrubbed: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        scrubbed[key] = '[REDACTED]';
      } else {
        scrubbed[key] = scrub(val, depth + 1);
      }
    }
    return scrubbed;
  }

  return data;
}

let securityEventSink: Array<{ event: string; details: unknown; timestamp: string }> = [];

export function getSecurityEvents(): Array<{ event: string; details: unknown; timestamp: string }> {
  return [...securityEventSink];
}

export function clearSecurityEvents(): void {
  securityEventSink = [];
}

export function logSecurityEvent(eventName: string, details: Record<string, unknown>): void {
  const scrubbedDetails = scrub(details) as Record<string, unknown>;
  const event = {
    timestamp: new Date().toISOString(),
    event: eventName,
    details: scrubbedDetails,
  };
  securityEventSink.push(event);

  const entry: LogEntry = {
    timestamp: event.timestamp,
    level: 'security',
    message: `[SECURITY_EVENT] ${eventName}`,
    context: scrubbedDetails,
  };

  console.warn(JSON.stringify(entry));
}

export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context: scrub(context) as Record<string, unknown>,
    };
    console.log(JSON.stringify(entry));
  },
  warn(message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context: scrub(context) as Record<string, unknown>,
    };
    console.warn(JSON.stringify(entry));
  },
  error(message: string, err?: unknown, context?: Record<string, unknown>): void {
    const errorObj =
      err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : err !== undefined
        ? { name: 'UnknownError', message: String(err) }
        : undefined;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context: scrub(context) as Record<string, unknown>,
      error: errorObj,
    };
    console.error(JSON.stringify(entry));
  },
};
