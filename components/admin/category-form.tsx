"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveCategoryAction } from "@/lib/admin/actions";
import { initialFormState } from "@/lib/forms/state";
import { Button } from "@/components/ui/button";
import { Checkbox, TextAreaField, TextField } from "@/components/ui/field";
import type { CategoryFormValues } from "@/lib/view-models";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export function CategoryForm({ category }: { category?: CategoryFormValues }) {
  const editing = category !== undefined;
  const [state, formAction] = useActionState(saveCategoryAction, initialFormState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {editing && <input type="hidden" name="categoryId" value={category.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Name"
          name="name"
          defaultValue={category?.name}
          required
          error={state.fieldErrors?.name}
        />
        <TextField
          label="URL slug"
          name="slug"
          defaultValue={category?.slug}
          required
          error={state.fieldErrors?.slug}
          hint="Changing this updates every stone in the variety."
        />
      </div>

      <TextAreaField
        label="Description"
        name="description"
        defaultValue={category?.description}
        rows={3}
        error={state.fieldErrors?.description}
        hint="Shown at the top of the variety's page."
      />

      <div className="grid items-end gap-4 sm:grid-cols-2">
        <TextField
          label="Sort order"
          name="sortOrder"
          type="number"
          inputMode="numeric"
          defaultValue={category?.sortOrder ?? 0}
          error={state.fieldErrors?.sortOrder}
          hint="Lower numbers appear first."
        />
        <Checkbox
          name="active"
          defaultChecked={category?.active ?? true}
          label="Active — shown in navigation"
        />
      </div>

      {state.message && (
        <p role="status" className={state.ok ? "text-sm text-success" : "text-sm text-danger"}>
          {state.message}
        </p>
      )}

      <div>
        <SubmitButton label={editing ? "Save variety" : "Add variety"} />
      </div>
    </form>
  );
}
