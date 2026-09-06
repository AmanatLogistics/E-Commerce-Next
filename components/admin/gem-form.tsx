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

  /*
   * What a field should show: what was just typed, if the save came back refused; otherwise
   * the stone being edited; otherwise nothing.
   *
   * React resets an uncontrolled <form action={…}> as soon as the action returns, so a
   * refusal used to blank every box on the page. Re-keying the form on `attempt` remounts it
   * with these as the new defaults, which is the only way the DOM picks them up — passing a
   * different defaultValue to an input that is already mounted does nothing.
   */
  const kept = (name: string, fallback?: string | number) => {
    const value = state.values?.[name];
    if (typeof value === "string") return value;
    return fallback === undefined ? undefined : String(fallback);
  };

  const keptImages = (): { url: string; alt: string }[] => {
    const urls = state.values?.imageUrl;
    if (!Array.isArray(urls)) return gem?.images ?? [];
    const alts = state.values?.imageAlt;
    return urls.map((url, index) => ({
      url,
      alt: (Array.isArray(alts) ? alts[index] : undefined) ?? "",
    }));
  };

  return (
    <form key={state.attempt ?? 0} action={formAction} className="flex flex-col gap-6">
      {editing && <input type="hidden" name="gemId" value={gem.id} />}

      <Section title="Identity" hint="The web address is made from the title — there is nothing to fill in for it.">
        <TextField
          label="Title"
          name="title"
          defaultValue={kept("title", gem?.title)}
          required
          error={state.fieldErrors?.title}
          hint="How it is named on the site. The web address is made from this."
        />
        <TextField
          label="Stock reference"
          name="reference"
          defaultValue={kept("reference", gem?.reference)}
          required
          error={state.fieldErrors?.reference}
          hint="Your own code for this stone, so you can find the packet again — whatever you already write on the envelope. Any format. It must not repeat another stone\u2019s."
        />
        <SelectField
          label="Variety"
          name="categoryId"
          defaultValue={kept("categoryId", gem?.categoryId)}
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
            defaultValue={kept("description", gem?.description)}
            rows={6}
            required
            error={state.fieldErrors?.description}
            hint="What a buyer should know: colour, cut decisions, what the inclusions are like."
          />
        </Wide>
      </Section>

      <ImageFields
        initial={keptImages()}
        error={state.fieldErrors?.images}
      />

      <Section title="Gemmology" hint="Everything a buyer compares on. Cut and clarity are optional — leave them blank for rough or specimen material and they will not appear on the listing.">
        <TextField
          label="Carat weight"
          name="caratWeight"
          type="number"
          step="0.01"
          inputMode="decimal"
          defaultValue={kept("caratWeight", gem?.caratWeight)}
          required
          error={state.fieldErrors?.caratWeight}
        />
        <TextField
          label="Shape"
          name="shape"
          defaultValue={kept("shape", gem?.shape)}
          required
          error={state.fieldErrors?.shape}
          hint="Oval, cushion, natural crystal…"
        />
        <TextField
          label="Cut"
          name="cut"
          defaultValue={kept("cut", gem?.cut)}
          error={state.fieldErrors?.cut}
          hint="Optional — an uncut crystal has none."
        />
        <TextField
          label="Clarity"
          name="clarity"
          defaultValue={kept("clarity", gem?.clarity)}
          error={state.fieldErrors?.clarity}
          hint="Optional."
        />
        <Wide>
          <TextField
            label="Colour"
            name="colour"
            defaultValue={kept("colour", gem?.colour)}
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
          defaultValue={kept("lengthMm", gem?.lengthMm)}
          required
          error={state.fieldErrors?.lengthMm}
        />
        <TextField
          label="Width (mm)"
          name="widthMm"
          type="number"
          step="0.01"
          inputMode="decimal"
          defaultValue={kept("widthMm", gem?.widthMm)}
          required
          error={state.fieldErrors?.widthMm}
        />
        <TextField
          label="Depth (mm)"
          name="depthMm"
          type="number"
          step="0.01"
          inputMode="decimal"
          defaultValue={kept("depthMm", gem?.depthMm)}
          required
          error={state.fieldErrors?.depthMm}
        />
        <TextField
          label="Origin"
          name="origin"
          defaultValue={kept("origin", gem?.origin)}
          required
          error={state.fieldErrors?.origin}
          hint="e.g. Panjshir Valley, Afghanistan"
        />
        <Wide>
          <TextField
            label="Treatment"
            name="treatment"
            defaultValue={kept("treatment", gem?.treatment)}
            required
            error={state.fieldErrors?.treatment}
            hint="Has the stone been heated, oiled, dyed or filled? Say so here. If nothing was done to it, write “None (untreated)” — that is a selling point, not a blank."
          />
        </Wide>
        <Wide>
          <TextField
            label="Certification"
            name="certificate"
            defaultValue={kept("certificate", gem?.certificate)}
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
          defaultValue={kept("priceMajor", gem?.priceMajor ?? "")}
          error={state.fieldErrors?.priceMajor}
          hint="Leave blank for “price on request”."
        />
        <SelectField
          label="Status"
          name="status"
          defaultValue={kept("status", gem?.status ?? "available")}
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
            defaultChecked={state.values ? state.values.published === "on" : (gem?.published ?? false)}
            label="Published — visible on the site"
          />
          <Checkbox
            name="featured"
            defaultChecked={state.values ? state.values.featured === "on" : (gem?.featured ?? false)}
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
