"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitContactAction } from "@/lib/enquiries/contact-action";
import { initialEnquiryState } from "@/lib/forms/state";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Sending…" : "Send enquiry"}
    </Button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState(submitContactAction, initialEnquiryState);

  if (state.ok) {
    return (
      <div
        className="rounded-[var(--radius-md)] border border-success bg-success-wash p-5"
        role="status"
      >
        <h2 className="text-h3 text-ink">Enquiry sent</h2>
        <p className="mt-1 text-body text-ink">
          Thank you — we will reply by email, usually within one working day.
        </p>
        {state.reference && (
          <p className="mt-2 text-sm text-ink-muted">
            Your reference is <strong className="text-ink">{state.reference}</strong>.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <TextField label="Your name" name="name" autoComplete="name" required error={state.fieldErrors?.name} />
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
        hint="Optional."
        error={state.fieldErrors?.phone}
      />
      <TextAreaField
        label="What are you looking for?"
        name="message"
        required
        rows={6}
        hint="Variety, approximate size, colour, budget and timing all help."
        error={state.fieldErrors?.message}
      />

      <div aria-hidden="true" className="absolute left-[-9999px] size-0 overflow-hidden">
        <label htmlFor="contact-website">Leave this field empty</label>
        <input id="contact-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {state.message && !state.ok && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
