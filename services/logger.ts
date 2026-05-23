/**
 * Centralized frontend logging service.
 * In production, console output is suppressed (except errors).
 * Can be extended to send logs to a remote endpoint (e.g., Sentry breadcrumbs).
 */
const IS_PROD = import.meta.env.PROD;

const formatMeta = (meta?: Record<string, unknown>): string =>
  meta ? ` ${JSON.stringify(meta)}` : '';

export const logger = {
  debug(msg: string, meta?: Record<string, unknown>) {
    if (!IS_PROD) console.debug(`[DEBUG] ${msg}${formatMeta(meta)}`);
  },

  info(msg: string, meta?: Record<string, unknown>) {
    if (!IS_PROD) console.info(`[INFO] ${msg}${formatMeta(meta)}`);
  },

  warn(msg: string, meta?: Record<string, unknown>) {
    console.warn(`[WARN] ${msg}${formatMeta(meta)}`);
  },

  error(msg: string, error?: unknown, meta?: Record<string, unknown>) {
    const errMsg = error instanceof Error ? error.message : String(error ?? '');
    console.error(`[ERROR] ${msg}${errMsg ? ': ' + errMsg : ''}${formatMeta(meta)}`);
  },
};

export default logger;
