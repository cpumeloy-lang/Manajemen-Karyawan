/**
 * src/services/errorReportingService.ts
 *
 * Wrapper Sentry untuk crash reporting & non-fatal error tracking.
 *
 * Sentry SDK (@sentry/react-native) butuh native build → tahan-banting:
 * bila modul belum tersedia di dev-client, jadi no-op tanpa crash app.
 *
 * Setup di production:
 *  1. `npm install @sentry/react-native --save`
 *  2. `npx @sentry/wizard@latest -i reactNative -p ios android`
 *  3. Set EXPO_PUBLIC_SENTRY_DSN di .env (atau hardcode bila perlu).
 *  4. Rebuild APK.
 *
 * Privacy: PII (Personally Identifiable Information) di-scrub default.
 * Hanya user.id (UUID) yang di-attach untuk korelasi, bukan email/name.
 */
import { Platform } from 'react-native';

let SentryModule: any = null;
let initialized = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SentryModule = require('@sentry/react-native');
} catch {
  SentryModule = null;
}

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || (__DEV__ ? 'development' : 'production');

export function initErrorReporting(): void {
  if (!SentryModule || !SENTRY_DSN || initialized) return;

  try {
    SentryModule.init({
      dsn: SENTRY_DSN,
      environment: APP_ENV,
      // Sample 10% of transactions in prod, 100% in dev.
      tracesSampleRate: APP_ENV === 'production' ? 0.1 : 1.0,
      // Default scrubs but kita explicit.
      sendDefaultPii: false,
      // Drop noise dari known harmless errors.
      beforeSend(event: any) {
        const msg = event?.message || event?.exception?.values?.[0]?.value || '';
        if (typeof msg === 'string') {
          // Network blip — bukan bug aplikasi.
          if (/Network request failed|TypeError: fetch failed/i.test(msg)) {
            return null;
          }
          // User cancelled image picker — bukan bug.
          if (/UserCancelled|cancelled by user/i.test(msg)) {
            return null;
          }
        }
        return event;
      },
    });

    SentryModule.setTag?.('platform', Platform.OS);
    SentryModule.setTag?.('platform_version', String(Platform.Version || ''));

    initialized = true;
    console.log('[errorReporting] Sentry initialized', APP_ENV);
  } catch (err) {
    console.warn('[errorReporting] Sentry init failed:', err);
  }
}

/**
 * Set user context (dipanggil setelah login).
 * Hanya UUID, no PII.
 */
export function setUserContext(userId: string | null): void {
  if (!SentryModule || !initialized) return;
  try {
    if (userId) {
      SentryModule.setUser?.({ id: userId });
    } else {
      SentryModule.setUser?.(null);
    }
  } catch {}
}

/**
 * Report exception non-fatal.
 * Untuk fatal error, ErrorBoundary akan handle otomatis via Sentry hook.
 */
export function captureException(
  err: unknown,
  context?: Record<string, any>
): void {
  if (!SentryModule || !initialized) {
    if (__DEV__) console.warn('[errorReporting]', err, context);
    return;
  }
  try {
    SentryModule.withScope?.((scope: any) => {
      if (context) {
        Object.entries(context).forEach(([k, v]) => scope.setExtra?.(k, v));
      }
      SentryModule.captureException?.(err);
    });
  } catch {}
}

/**
 * Report event/log/breadcrumb. Useful untuk track flow custom.
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  if (!SentryModule || !initialized) return;
  try {
    SentryModule.captureMessage?.(message, level);
  } catch {}
}

/**
 * Add breadcrumb untuk konteks (mis. "user tap check-in", "navigated to history").
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, any>
): void {
  if (!SentryModule || !initialized) return;
  try {
    SentryModule.addBreadcrumb?.({
      category,
      message,
      level: 'info',
      data,
    });
  } catch {}
}

export const isSentryAvailable = () => !!SentryModule && initialized;
