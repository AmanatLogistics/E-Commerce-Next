"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveSettingsAction } from "@/lib/admin/settings-actions";
import { initialFormState } from "@/lib/forms/state";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import type { EditableSettings } from "@/lib/settings";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save details"}
    </Button>
  );
}

export function SettingsForm({ settings }: { settings: EditableSettings }) {
  const [state, formAction] = useActionState(saveSettingsAction, initialFormState);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-h3 font-body">Name</h2>

        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <TextField
            label="Business name"
            name="name"
            defaultValue={settings.name}
            required
            error={state.fieldErrors?.name}
            hint="The wordmark, every page title, and the footer."
          />
          <TextField
            label="Short name"
            name="shortName"
            defaultValue={settings.shortName}
            required
            error={state.fieldErrors?.shortName}
            hint="Used in the admin panel's own header."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <TextField
            label="Initials"
            name="initials"
            defaultValue={settings.initials}
            required
            error={state.fieldErrors?.initials}
            hint="Where the full name will not fit."
          />
          <TextField
            label="Tagline"
            name="tagline"
            defaultValue={settings.tagline}
            required
            error={state.fieldErrors?.tagline}
            hint="The headline on the home page."
          />
        </div>

        <TextAreaField
          label="Description"
          name="description"
          defaultValue={settings.description}
          rows={3}
          required
          error={state.fieldErrors?.description}
          hint="One or two sentences. Used in search results and when the site is shared."
        />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h3 font-body">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
          <TextField
            label="Email address"
            name="contactEmail"
            type="email"
            defaultValue={settings.contactEmail}
            required
            error={state.fieldErrors?.contactEmail}
            hint="Shown to buyers. Where enquiry notifications go is set separately, in your hosting environment."
          />
          <TextField
            label="Phone"
            name="contactPhone"
            defaultValue={settings.contactPhone}
            required
            error={state.fieldErrors?.contactPhone}
          />
        </div>
        <TextField
          label="Address"
          name="address"
          defaultValue={settings.address}
          required
          error={state.fieldErrors?.address}
        />
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-h3 font-body">Promises</h2>
          <p className="mt-1 text-sm text-ink-muted">
            The claims that scroll across the top of every page and appear again above the
            footer. Only make ones you keep.
          </p>
        </div>

        {settings.promises.map((promise, index) => (
          <div
            key={index}
            className="grid gap-4 rounded-[var(--radius-md)] border bg-surface-sunken p-4 sm:grid-cols-[1fr_2fr] sm:items-end"
          >
            <TextField
              label={`Promise ${index + 1}`}
              name="promiseTitle"
              defaultValue={promise.title}
            />
            <TextField label="Detail" name="promiseBody" defaultValue={promise.body} />
          </div>
        ))}
      </section>

      {state.message && (
        <p role="status" className={state.ok ? "text-sm text-success" : "text-sm text-danger"}>
          {state.message}
        </p>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
