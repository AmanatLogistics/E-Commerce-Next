"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateEnquiryAction } from "@/lib/admin/actions";
import { initialFormState } from "@/lib/forms/state";
import { Button } from "@/components/ui/button";
import { SelectField, TextAreaField } from "@/components/ui/field";
import type { EnquiryStatus } from "@/lib/db/documents";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

export function EnquiryStatusForm({
  enquiryId,
  status,
  adminNote,
}: {
  enquiryId: string;
  status: EnquiryStatus;
  adminNote: string;
}) {
  const [state, formAction] = useActionState(updateEnquiryAction, initialFormState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="enquiryId" value={enquiryId} />

      <SelectField
        label="Status"
        name="status"
        defaultValue={status}
        options={[
          { value: "new", label: "New" },
          { value: "replied", label: "Replied" },
          { value: "closed", label: "Closed" },
        ]}
      />

      <TextAreaField
        label="Internal note"
        name="adminNote"
        defaultValue={adminNote}
        rows={4}
        hint="Only visible here. The buyer never sees this."
      />

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
