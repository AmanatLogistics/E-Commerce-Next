"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createGemAction, updateGemAction } from "@/lib/admin/actions";
import { initialFormState } from "@/lib/forms/state";
import { Button } from "@/components/ui/button";
import { Checkbox, SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { ImageFields } from "@/components/admin/image-fields";
import type { CategoryOption, GemFormValues } from "@/lib/view-models";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-[var(--radius-md)] border bg-surface p-5">
      <legend className="px-1">
        <span className="text-h3 font-body">{title}</span>
      </legend>
      {hint && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{hint}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:items-end">{children}</div>
    </fieldset>
  );
}

/** A field that should have the row to itself. */
function Wide({ children }: { children: React.ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}

export function GemForm({
  categories,
  gem,
}: {
  categories: CategoryOption[];
  gem?: GemFormValues;
}) {
  const editing = gem !== undefined;
  const [state, formAction] = useActionState(
    editing ? updateGemAction : createGemAction,
    initialFormState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {editing && <input type="hidden" name="gemId" value={gem.id} />}

      <Section title="Identity" hint="The web address is made from the title — there is nothing to fill in for it.">
        <TextField
          label="Title"
          name="title"
          defaultValue={gem?.title}
          required
          error={state.fieldErrors?.title}
          hint="How the stone is named on the site."
        />
        <TextField
          label="Stock reference"
          name="reference"
          defaultValue={gem?.reference}
          required
          error={state.fieldErrors?.reference}
          hint="Your own packet reference, e.g. AEC-EM-0101."
        />
        <SelectField
          label="Variety"
          name="categoryId"
          defaultValue={gem?.categoryId}
          required
          error={state.fieldErrors?.categoryId}
          options={categories.map((category) => ({
            value: category.id,
            label: category.name,
          }))}
        />
        <Wide>
          <TextAreaField
            label="Description"
            name="description"
            defaultValue={gem?.description}
            rows={6}
            required
            error={state.fieldErrors?.description}
            hint="What a buyer should know: colour, cut decisions, what the inclusions are like."
          />
        </Wide>
      </Section>

      <ImageFields
        initial={gem?.images ?? []}
        error={state.fieldErrors?.images}
      />

      <Section title="Gemmology" hint="Everything a buyer compares on. Cut and clarity are optional — leave them blank for rough or specimen material and they will not appear on the listing.">
        <TextField
          label="Carat weight"
          name="caratWeight"
          type="number"
          step="0.01"
          inputMode="decimal"
          defaultValue={gem?.caratWeight}
          required
          error={state.fieldErrors?.caratWeight}
        />
        <TextField
          label="Shape"
          name="shape"
          defaultValue={gem?.shape}
          required
          error={state.fieldErrors?.shape}
          hint="Oval, cushion, natural crystal…"
        />
        <TextField
          label="Cut"
          name="cut"
          defaultValue={gem?.cut}
          error={state.fieldErrors?.cut}
          hint="Optional — an uncut crystal has none."
        />
        <TextField
          label="Clarity"
          name="clarity"
          defaultValue={gem?.clarity}
          error={state.fieldErrors?.clarity}
          hint="Optional."
        />
        <Wide>
          <TextField
            label="Colour"
            name="colour"
            defaultValue={gem?.colour}
            required
            error={state.fieldErrors?.colour}
          />
        </Wide>
        <TextField
          label="Length (mm)"
          name="lengthMm"
          type="number"
          step="0.01"
          inputMode="decimal"
          defaultValue={gem?.lengthMm}
          required
          error={state.fieldErrors?.lengthMm}
        />
        <TextField
          label="Width (mm)"
          name="widthMm"
          type="number"
          step="0.01"
          inputMode="decimal"
          defaultValue={gem?.widthMm}
          required
          error={state.fieldErrors?.widthMm}
        />
        <TextField
          label="Depth (mm)"
          name="depthMm"
          type="number"
          step="0.01"
          inputMode="decimal"
          defaultValue={gem?.depthMm}
          required
          error={state.fieldErrors?.depthMm}
        />
        <TextField
          label="Origin"
          name="origin"
          defaultValue={gem?.origin}
          required
          error={state.fieldErrors?.origin}
          hint="e.g. Panjshir Valley, Afghanistan"
        />
        <Wide>
          <TextField
            label="Treatment"
            name="treatment"
            defaultValue={gem?.treatment}
            required
            error={state.fieldErrors?.treatment}
            hint="Required. Write “None (untreated)” when there is none — disclosure is not optional."
          />
        </Wide>
        <Wide>
          <TextField
            label="Certification"
            name="certificate"
            defaultValue={gem?.certificate}
            error={state.fieldErrors?.certificate}
            hint="Optional. Lab and report number, or a note that one is available."
          />
        </Wide>
      </Section>

      <Section title="Price and availability">
        <TextField
          label="Price (whole dollars)"
          name="priceMajor"
          type="number"
          inputMode="numeric"
          defaultValue={gem?.priceMajor ?? ""}
          error={state.fieldErrors?.priceMajor}
          hint="Leave blank for “price on request”."
        />
        <SelectField
          label="Status"
          name="status"
          defaultValue={gem?.status ?? "available"}
          options={[
            { value: "available", label: "Available" },
            { value: "reserved", label: "Reserved" },
            { value: "sold", label: "Sold" },
          ]}
        />
        <Wide>
          <div className="flex flex-col gap-3">
          <Checkbox
            name="published"
            defaultChecked={gem?.published ?? false}
            label="Published — visible on the site"
          />
          <Checkbox
            name="featured"
            defaultChecked={gem?.featured ?? false}
            label="Featured — show under “Selected stones” on the home page"
          />
          </div>
        </Wide>
      </Section>


      {state.message && (
        <p role="alert" className={state.ok ? "text-sm text-success" : "text-sm text-danger"}>
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton label={editing ? "Save changes" : "Add stone"} />
        <Button variant="secondary" asChild>
          <Link href="/admin/gems">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
