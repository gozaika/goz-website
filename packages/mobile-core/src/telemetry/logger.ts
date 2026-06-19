import { redact } from "./redact";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

export interface LoggerOptions {
  /** Minimum level to emit. Defaults to "info" (use "debug" in dev). */
  readonly minLevel?: LogLevel;
  /** Sink for structured records; defaults to console. */
  readonly sink?: (level: LogLevel, event: string, fields: LogFields) => void;
}

const LEVEL_ORDER: Readonly<Record<LogLevel, number>> = { debug: 0, info: 1, warn: 2, error: 3 };

/**
 * Structured logger that redacts every record before it reaches the sink. All
 * mobile-core internals log through this; raw tokens/PII can never be emitted.
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const minLevel = options.minLevel ?? "info";
  const sink =
    options.sink ??
    ((level, event, fields) => {
      // eslint-disable-next-line no-console
      (console[level] ?? console.log)(`[gozaika] ${event}`, fields);
    });

  const emit = (level: LogLevel, event: string, fields?: LogFields): void => {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) {
      return;
    }
    sink(level, event, (redact(fields ?? {}) as LogFields) ?? {});
  };

  return {
    debug: (event, fields) => emit("debug", event, fields),
    info: (event, fields) => emit("info", event, fields),
    warn: (event, fields) => emit("warn", event, fields),
    error: (event, fields) => emit("error", event, fields),
  };
}

/** No-op logger for tests. */
export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};
