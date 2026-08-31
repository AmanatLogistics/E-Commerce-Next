"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createGemAction, updateGemAction } from "@/lib/admin/actions";
import { initialFormState } from "@/lib/forms/state";
import { Button } from "@/components/ui/button";
import { Checkbox, SelectField, TextAreaField, TextField } from "@/components/ui/field";
import type { CategoryOption, GemFormValues } from "@/lib/view-models";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-[var(--radius-md)] border bg-surface p-5">
      <legend className="label-caps px-1">{title}</legend>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
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

  // Images are a repeatable pair of fields; the count is the only client state here.
  const [imageCount, setImageCount] = useState(Math.max(gem?.images.length ?? 1, 1));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {editing && <input type="hidden" name="gemId" value={gem.id} />}

      <Section title="Identity">
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
          hint="Your own packet reference, e.g. KG-EM-0101."
        />
        <TextField
          label="URL slug"
          name="slug"
          defaultValue={gem?.slug}
          required
          error={state.fieldErrors?.slug}
          hint="Lowercase words separated by hyphens."
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
        <div className="sm:col-span-2">
          <TextAreaField
            label="Description"
            name="description"
            defaultValue={gem?.description}
            rows={6}
            required
            error={state.fieldErrors?.description}
            hint="What a buyer should know: colour, cut decisions, what the inclusions are like."
          />
        </div>
      </Section>

      <Section title="Gemmology">
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
        />
        <TextField
          label="Cut"
          name="cut"
          defaultValue={gem?.cut}
          required
          error={state.fieldErrors?.cut}
        />
        <TextField
          label="Clarity"
          name="clarity"
          defaultValue={gem?.clarity}
          required
          error={state.fieldErrors?.clarity}
        />
        <div className="sm:col-span-2">
          <TextField
            label="Colour"
            name="colour"
            defaultValue={gem?.colour}
            required
            error={state.fieldErrors?.colour}
          />
        </div>
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
          hint="e.g. Swat Valley, Pakistan"
        />
        <div className="sm:col-span-2">
          <TextField
            label="Treatment"
            name="treatment"
            defaultValue={gem?.treatment}
            required
            error={state.fieldErrors?.treatment}
            hint="Required. Write “None (untreated)” when there is none — disclosure is not optional."
          />
        </div>
        <div className="sm:col-span-2">
          <TextField
            label="Certification"
            name="certificate"
            defaultValue={gem?.certificate}
            error={state.fieldErrors?.certificate}
            hint="Optional. Lab and report number, or a note that one is available."
          />
        </div>
      </Section>

      <Section title="Price and availability">
        <TextField
          label="Price (whole rupees)"
          name="priceRupees"
          type="number"
          inputMode="numeric"
          defaultValue={gem?.priceRupees ?? ""}
          error={state.fieldErrors?.priceRupees}
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
        <div className="flex flex-col gap-3 sm:col-span-2">
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
      </Section>

      <fieldset className="rounded-[var(--radius-md)] border bg-surface p-5">
        <legend className="label-caps px-1">Images</legend>
        <p className="mt-2 text-sm text-ink-muted">
          Paste a URL for each photograph, in the order they should appear. The demo
          catalogue uses generated placeholders at{" "}
          <code className="rounded-[var(--radius-sm)] bg-surface-sunken px-1">
            /img/gem/&lt;slug&gt;/1
          </code>
          ; a real listing points at your image host.
        </p>
        {state.fieldErrors?.images && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {state.fieldErrors.images}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-4">
          {Array.from({ length: imageCount }, (_, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-2">
              <TextField
                label={`Image ${i + 1} URL`}
                name="imageUrl"
                defaultValue={gem?.images[i]?.url ?? ""}
              />
              <TextField
                label={`Image ${i + 1} description`}
                name="imageAlt"
                defaultValue={gem?.images[i]?.alt ?? ""}
                hint="Read aloud by screen readers."
              />
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setImageCount((n) => Math.min(n + 1, 8))}
          >
            Add another image
          </Button>
          {imageCount > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setImageCount((n) => Math.max(n - 1, 1))}
            >
              Remove last
            </Button>
          )}
        </div>
      </fieldset>

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
