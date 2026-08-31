"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitEnquiryAction } from "@/lib/enquiries/actions";
import { initialEnquiryState } from "@/lib/forms/state";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" fullWidth disabled={pending}>
      {pending ? "Sending…" : "Send enquiry"}
    </Button>
  );
}

/**
 * The enquiry form replaces cart and checkout entirely.
 *
 * Only the stone's slug is submitted — its title, reference and price are read from the
 * database on the server, so nothing about the stone can be forged through this form.
 * The `website` field is a honeypot: it is hidden from people and from screen readers, and
 * a filled one is treated as spam.
 */
export function EnquiryForm({
  gemSlug,
  gemTitle,
  gemReference,
}: {
  gemSlug: string;
  gemTitle: string;
  gemReference: string;
}) {
  const [state, formAction] = useActionState(submitEnquiryAction, initialEnquiryState);

  if (state.ok) {
    return (
      <div
        className="rounded-[var(--radius-md)] border border-success bg-success-wash p-4"
        role="status"
      >
        <h3 className="text-h3 text-ink">Enquiry sent</h3>
        <p className="mt-1 text-body text-ink">
          Thank you — we have your enquiry about {gemTitle} and will reply by email, usually
          within one working day.
        </p>
        {state.reference && (
          <p className="mt-2 text-sm text-ink-muted">
            Your reference is <strong className="text-ink">{state.reference}</strong>. Quote it
            if you get in touch about this stone again.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="gemSlug" value={gemSlug} />

      <div>
        <h3 className="text-h3">Enquire about this stone</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Ask about price, certification, video, or a viewing. We reply to every enquiry
          about {gemReference} personally — there is no automated quote.
        </p>
      </div>

      <TextField
        label="Your name"
        name="name"
        autoComplete="name"
        required
        error={state.fieldErrors?.name}
      />
      <TextField
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />
      <TextField
        label="Phone or WhatsApp"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        hint="Optional. Useful if you would rather we call."
        error={state.fieldErrors?.phone}
      />
      <TextAreaField
        label="Your message"
        name="message"
        required
        rows={5}
        defaultValue={`I am interested in ${gemReference} (${gemTitle}). Could you tell me more about `}
        error={state.fieldErrors?.message}
      />

      {/* Honeypot. Hidden from sighted users and from assistive technology alike. */}
      <div aria-hidden="true" className="absolute left-[-9999px] size-0 overflow-hidden">
        <label htmlFor="website-field">Leave this field empty</label>
        <input id="website-field" type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {state.message && !state.ok && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <SubmitButton />

      <p className="text-sm text-ink-muted">
        We use your details only to answer this enquiry. No account is created and nothing is
        charged.
      </p>
    </form>
  );
}
