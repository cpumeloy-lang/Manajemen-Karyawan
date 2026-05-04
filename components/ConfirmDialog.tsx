/**
 * components/ConfirmDialog.tsx
 * Styled, accessible confirmation dialog as a replacement for window.confirm().
 * Provides a Promise-based API via the useConfirm() hook.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

type ConfirmVariant = 'default' | 'danger' | 'warning' | 'success';

export interface ConfirmOptions {
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  /** If provided, user must type this exact string to enable the confirm button. */
  requireText?: string;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const variantStyles: Record<ConfirmVariant, { btn: string; icon: string; iconBg: string }> = {
  default: {
    btn: 'bg-primary hover:bg-primary-dark focus:ring-primary/30',
    icon: '?',
    iconBg: 'bg-primary-light text-primary',
  },
  danger: {
    btn: 'bg-red-600 hover:bg-red-700 focus:ring-red-300',
    icon: '!',
    iconBg: 'bg-red-100 text-red-600',
  },
  warning: {
    btn: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-300',
    icon: '!',
    iconBg: 'bg-amber-100 text-amber-700',
  },
  success: {
    btn: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300',
    icon: '✓',
    iconBg: 'bg-emerald-100 text-emerald-700',
  },
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState('');
  const resolverRef = useRef<((v: boolean) => void) | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const normalized: ConfirmOptions =
      typeof options === 'string' ? { message: options } : options;
    setTyped('');
    setOpts(normalized);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOpts(null);
    setTyped('');
  }, []);

  // Focus cancel button on open + handle Escape
  useEffect(() => {
    if (!opts) return;
    cancelBtnRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [opts, close]);

  const variant = opts?.variant || 'default';
  const styles = variantStyles[variant];
  const requireOk =
    !opts?.requireText || typed.trim() === opts.requireText.trim();

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {opts && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => close(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl font-bold ${styles.iconBg}`}
                  aria-hidden="true"
                >
                  {styles.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    id="confirm-dialog-title"
                    className="text-lg font-semibold text-slate-900"
                  >
                    {opts.title || 'Konfirmasi'}
                  </h3>
                  <div className="mt-2 text-sm text-slate-600 whitespace-pre-wrap break-words">
                    {opts.message}
                  </div>

                  {opts.requireText && (
                    <div className="mt-4">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Ketik <span className="font-mono font-bold">{opts.requireText}</span> untuk konfirmasi
                      </label>
                      <input
                        type="text"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        autoFocus
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 bg-slate-50 px-6 py-4 border-t border-slate-200">
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={() => close(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200"
              >
                {opts.cancelLabel || 'Batal'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                disabled={!requireOk}
                className={`px-4 py-2 text-sm font-medium rounded-lg text-white shadow-sm focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed ${styles.btn}`}
              >
                {opts.confirmLabel || 'Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export function useConfirm(): ConfirmContextValue['confirm'] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback to window.confirm if Provider missing — keeps things robust
    // eslint-disable-next-line no-console
    console.warn('useConfirm() called outside ConfirmProvider; falling back to window.confirm.');
    return (opts) => {
      const msg = typeof opts === 'string' ? opts : String(opts.message || '');
      return Promise.resolve(window.confirm(msg));
    };
  }
  return ctx.confirm;
}
