"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Labels are always rendered above the control and never replaced by a placeholder:
 * a placeholder disappears on focus, which is exactly when a form needs to still say
 * what a field is (docs/RESEARCH.md rule 6).
 */

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

function FieldShell({ label, error, hint, required, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="text-danger ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {children(id, describedBy)}
      {error && (
        <p id={errorId} className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL =
  "h-10 w-full rounded-[var(--radius-md)] border bg-surface px-3 text-body text-ink " +
  "placeholder:text-ink-muted transition-colors " +
  "hover:border-ink-muted focus:border-accent disabled:bg-surface-sunken disabled:cursor-not-allowed";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextField({ label, error, hint, required, className, ...props }: TextFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      {(id, describedBy) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          required={required}
          className={cn(CONTROL, error && "border-danger", className)}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  label: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
}

export function SelectField({
  label,
  error,
  hint,
  required,
  options,
  className,
  ...props
}: SelectFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      {(id, describedBy) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          required={required}
          className={cn(CONTROL, error && "border-danger", className)}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

export interface TextAreaFieldProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextAreaField({
  label,
  error,
  hint,
  required,
  className,
  ...props
}: TextAreaFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required}>
      {(id, describedBy) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          required={required}
          className={cn(
            CONTROL,
            "h-auto min-h-24 py-2 leading-[var(--leading-body)]",
            error && "border-danger",
            className,
          )}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        className={cn(
          "mt-0.5 size-4 shrink-0 rounded-[var(--radius-sm)] border accent-[var(--accent)]",
          className,
        )}
        {...props}
      />
      <label htmlFor={id} className="text-body text-ink">
        {label}
      </label>
    </div>
  );
}
