/**
 * Form state shapes and their initial values.
 *
 * These live outside the "use server" modules on purpose: a file marked "use server" may
 * export async functions and nothing else, so a plain constant exported alongside an
 * action makes the whole module fail to load at runtime.
 */

export interface FormState {
  ok: boolean;
  message: string;
  /** Field-level messages, keyed by field name, for inline display. */
  fieldErrors?: Record<string, string>;
}

export interface EnquiryFormState extends FormState {
  /** The buyer's quotable reference, once the enquiry is recorded. */
  reference?: string;
}

export const initialFormState: FormState = { ok: false, message: "" };
export const initialEnquiryState: EnquiryFormState = { ok: false, message: "" };

/** Collapses Zod issues into one message per field, keeping the first for each. */
export function fieldErrorsFrom(
  issues: readonly { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
