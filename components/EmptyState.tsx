/**
 * components/EmptyState.tsx
 * Reusable empty-state component with icon, title, description, and optional CTA.
 */

import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const DefaultIcon: React.FC = () => (
  <svg
    className="h-16 w-16 text-slate-300"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
    />
  </svg>
);

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className}`}
    >
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 ring-4 ring-slate-100">
        {icon || <DefaultIcon />}
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/20"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
