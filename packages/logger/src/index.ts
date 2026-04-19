/**
 * @file packages/logger/src/index.ts
 * @description Shared structured logger with environment-safe defaults.
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogMeta {
  readonly [key: string]: string | number | boolean | null | undefined;
}

/**
 * Writes structured logs in development and suppresses noisy info logs in production.
 *
 * @param level - Severity level.
 * @param message - Human-readable message.
 * @param meta - Optional structured fields for filtering and debugging.
 * @returns Nothing.
 */
export function log(level: LogLevel, message: string, meta?: LogMeta): void {
  if (process.env.NODE_ENV === 'production' && level === 'info') {
    return;
  }

  const payload = {
    level,
    message,
    meta,
    timestamp: new Date().toISOString(),
  };

  if (level === 'error') {
    console.error(payload);
    return;
  }

  if (level === 'warn') {
    console.warn(payload);
    return;
  }

  console.info(payload);
}
