"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  changeOwnPasswordAction,
  createAccountAction,
  resetAccountPasswordAction,
} from "@/lib/auth/account-actions";
import { initialFormState } from "@/lib/forms/state";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";

/**
 * The three forms on the accounts screen. They are separate components rather than one
 * with a mode, because each posts to a different action and shares no state — merging them
 * would mean a submission in one clearing the message in another.
 */

function SubmitButton({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? busy : label}
    </Button>
  );
}

/** The message every one of these forms ends with, in the same place each time. */
function Result({ state }: { state: { ok: boolean; message: string } }) {
  if (!state.message) return null;
  return (
    <p role="status" className={state.ok ? "text-sm text-success" : "text-sm text-danger"}>
      {state.message}
    </p>
  );
}

export function CreateAccountForm() {
  const [state, formAction] = useActionState(createAccountAction, initialFormState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <TextField
          label="Name"
          name="name"
          autoComplete="off"
          required
          error={state.fieldErrors?.name}
        />
        <TextField
          label="Email address"
          name="email"
          type="email"
          autoComplete="off"
          required
          error={state.fieldErrors?.email}
          hint="What they will sign in with."
        />
      </div>

      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.password}
        hint="At least 10 characters, with an uppercase letter, a lowercase letter and a number. Tell them in person, not by email."
      />

      <Result state={state} />

      <div>
        <SubmitButton label="Create account" busy="Creating…" />
      </div>
    </form>
  );
}

export function ChangeOwnPasswordForm() {
  const [state, formAction] = useActionState(changeOwnPasswordAction, initialFormState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <TextField
          label="Current password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          error={state.fieldErrors?.currentPassword}
        />
        <TextField
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          error={state.fieldErrors?.newPassword}
          hint="At least 10 characters, with an uppercase letter, a lowercase letter and a number."
        />
      </div>

      <Result state={state} />

      <div>
        <SubmitButton label="Change my password" busy="Changing…" />
      </div>
    </form>
  );
}

export function ResetAccountPasswordForm({
  accountId,
  email,
}: {
  accountId: string;
  email: string;
}) {
  const [state, formAction] = useActionState(resetAccountPasswordAction, initialFormState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="accountId" value={accountId} />
      <TextField
        label={`New password for ${email}`}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.password}
        hint="They are signed out everywhere as soon as this is set."
      />

      <Result state={state} />

      <div>
        <SubmitButton label="Set password" busy="Setting…" />
      </div>
    </form>
  );
}
