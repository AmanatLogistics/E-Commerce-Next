import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Pagination } from "@/components/ui/pagination";
import { Checkbox, SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { formatMoney, rupees } from "@/lib/money";
import { contrastRatio } from "@/lib/contrast";

export const metadata: Metadata = {
  title: "Style guide",
  robots: { index: false, follow: false },
};

/**
 * Every token and component state on one page, so the design system can be reviewed before
 * any page is built on it. Contrast figures are computed here from the token values rather
 * than asserted, so a token change that breaks AA shows up on this page immediately.
 */

const LIGHT = {
  surface: "#ffffff",
  "surface-sunken": "#ebeff1",
  ink: "#0b1a24",
  "ink-muted": "#4a5b66",
  line: "#d3dce1",
  primary: "#0e5a74",
  "primary-hover": "#0a4457",
  accent: "#e8a200",
  success: "#1b7a4b",
  danger: "#b3261e",
} as const;

const DARK = {
  surface: "#0b1418",
  "surface-sunken": "#111e24",
  ink: "#e6edf0",
  "ink-muted": "#9cb0ba",
  line: "#24343c",
  primary: "#3fa0c4",
  "primary-hover": "#5fb6d6",
  accent: "#f5b93a",
  success: "#3fb37c",
  danger: "#e4675e",
} as const;

const CONTRAST_PAIRS: { label: string; fg: string; bg: string; min: number }[] = [
  { label: "ink on surface", fg: LIGHT.ink, bg: LIGHT.surface, min: 4.5 },
  { label: "ink-muted on surface", fg: LIGHT["ink-muted"], bg: LIGHT.surface, min: 4.5 },
  { label: "white on primary", fg: "#ffffff", bg: LIGHT.primary, min: 4.5 },
  { label: "ink on accent (chip)", fg: "#2a1f00", bg: LIGHT.accent, min: 4.5 },
  { label: "success on success-wash", fg: LIGHT.success, bg: "#e2f2ea", min: 4.5 },
  { label: "danger on danger-wash", fg: LIGHT.danger, bg: "#fbe9e7", min: 4.5 },
  { label: "dark: ink on surface", fg: DARK.ink, bg: DARK.surface, min: 4.5 },
  { label: "dark: ink-muted on surface", fg: DARK["ink-muted"], bg: DARK.surface, min: 4.5 },
  { label: "dark: primary on surface", fg: DARK.primary, bg: DARK.surface, min: 4.5 },
];

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t pt-8">
      <div>
        <h2 className="text-h2">{title}</h2>
        {note && <p className="mt-1 max-w-prose text-sm text-ink-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Swatches({ title, tokens }: { title: string; tokens: Record<string, string> }) {
  return (
    <div>
      <h3 className="text-h3 mb-3">{title}</h3>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(tokens).map(([name, hex]) => (
          <li key={name} className="overflow-hidden rounded-[var(--radius-md)] border">
            <div className="h-16" style={{ background: hex }} />
            <div className="px-2.5 py-2">
              <p className="text-sm font-medium">--{name}</p>
              <p className="text-xs text-ink-muted uppercase">{hex}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <header>
        <h1 className="text-display">Style guide</h1>
        <p className="mt-2 max-w-prose text-ink-muted">
          Every token and component state in one place. Implements{" "}
          <code className="rounded-[var(--radius-sm)] bg-surface-sunken px-1">docs/DESIGN.md</code>.
          Switch your system to dark mode to review the dark palette — the page follows{" "}
          <code className="rounded-[var(--radius-sm)] bg-surface-sunken px-1">
            prefers-color-scheme
          </code>
          .
        </p>
      </header>

      <Section
        title="Colour"
        note="Six roles. Petrol blue carries structure and actions; brass carries price and discount, and nothing else."
      >
        <Swatches title="Light" tokens={LIGHT} />
        <Swatches title="Dark" tokens={DARK} />
      </Section>

      <Section
        title="Contrast"
        note="Measured from the token values on this page, not asserted. AA needs 4.5:1 for body text."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b text-ink-muted">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">Pair</th>
                <th scope="col" className="py-2 pr-4 font-medium">Ratio</th>
                <th scope="col" className="py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {CONTRAST_PAIRS.map((pair) => {
                const ratio = contrastRatio(pair.fg, pair.bg);
                const pass = ratio >= pair.min;
                return (
                  <tr key={pair.label} className="border-b last:border-0">
                    <td className="py-2 pr-4">{pair.label}</td>
                    <td className="py-2 pr-4">{ratio.toFixed(2)}:1</td>
                    <td className="py-2">
                      <Badge tone={pass ? "success" : "danger"}>{pass ? "Pass AA" : "Fails AA"}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Type scale" note="Archivo for headings, IBM Plex Sans for body and tables.">
        <div className="flex flex-col gap-3">
          <p className="text-display">Display — Electronics and home goods</p>
          <p className="text-h1">Heading 1 — Mobiles &amp; Tablets</p>
          <p className="text-h2">Heading 2 — Deals this week</p>
          <p className="text-h3">Heading 3 — Specifications</p>
          <p className="text-body">
            Body — a 5000mAh battery that comfortably clears a day, and 33W charging that fills it
            over a lunch break.
          </p>
          <p className="text-sm text-ink-muted">Small — free delivery on orders over Rs 5,000</p>
          <p className="text-xs">EXTRA SMALL — used for chips and badges</p>
          <p className="text-body">
            Tabular figures line up:{" "}
            <span className="font-medium">
              {formatMoney(rupees(1249))} / {formatMoney(rupees(18999))} /{" "}
              {formatMoney(rupees(189999))}
            </span>
          </p>
        </div>
      </Section>

      <Section title="Buttons" note="Every variant in default, hover-capable, and disabled states.">
        <div className="flex flex-col gap-4">
          {(["primary", "secondary", "accent", "ghost", "danger"] as const).map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-3">
              <span className="w-20 text-sm text-ink-muted">{variant}</span>
              <Button variant={variant} size="sm">Small</Button>
              <Button variant={variant}>Add to cart</Button>
              <Button variant={variant} size="lg">Large</Button>
              <Button variant={variant} disabled>Disabled</Button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Form fields" note="Labels sit above the control and never vanish on focus.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Full name" placeholder="Ayesha Khan" autoComplete="name" required />
          <TextField label="Email" type="email" placeholder="you@example.com" autoComplete="email" />
          <TextField
            label="Postal code"
            inputMode="numeric"
            placeholder="54000"
            hint="Five digits."
          />
          <TextField label="Phone" error="Enter a valid phone number" defaultValue="03" />
          <SelectField
            label="Province"
            options={[
              { value: "punjab", label: "Punjab" },
              { value: "sindh", label: "Sindh" },
            ]}
          />
          <TextField label="Disabled field" disabled defaultValue="Not editable" />
          <div className="sm:col-span-2">
            <TextAreaField label="Delivery notes" placeholder="Gate code, landmark, timing" />
          </div>
          <div className="sm:col-span-2">
            <Checkbox label="Billing address is the same as the shipping address" defaultChecked />
          </div>
        </div>
      </Section>

      <Section title="Badges" note="Brass is a chip background with dark ink on top, never text on white.">
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge>
          <Badge tone="info">Processing</Badge>
          <Badge tone="success">In stock</Badge>
          <Badge tone="danger">Out of stock</Badge>
          <Badge tone="accent">−24%</Badge>
        </div>
      </Section>

      <Section title="Cards and elevation" note="Level 0 is a hairline border; shadow is only for floating layers.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <h3 className="text-h3">Level 0</h3>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-ink-muted">Cards, panels, the product grid. No shadow.</p>
            </CardBody>
          </Card>
          <div className="rounded-[var(--radius-md)] border bg-surface-raised p-4 shadow-e1">
            <h3 className="text-h3">Level 1</h3>
            <p className="mt-1 text-sm text-ink-muted">Dropdowns and popovers.</p>
          </div>
          <div className="rounded-[var(--radius-lg)] border bg-surface-raised p-4 shadow-e2">
            <h3 className="text-h3">Level 2</h3>
            <p className="mt-1 text-sm text-ink-muted">Modals and the mobile filter sheet.</p>
          </div>
        </div>
      </Section>

      <Section title="Radius scale" note="Radius encodes what a thing is, rather than one value everywhere.">
        <div className="flex flex-wrap items-end gap-4">
          {[
            ["sm — 3px", "var(--radius-sm)"],
            ["md — 6px", "var(--radius-md)"],
            ["lg — 10px", "var(--radius-lg)"],
            ["full", "var(--radius-full)"],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="size-16 border bg-surface-sunken" style={{ borderRadius: value }} />
              <span className="text-sm text-ink-muted">{label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Spacing scale" note="4px base. Nothing off-scale.">
        <div className="flex flex-wrap items-end gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
            <div key={step} className="flex flex-col items-center gap-2">
              <div
                className="bg-primary"
                style={{ width: `var(--space-${step})`, height: `var(--space-${step})` }}
              />
              <span className="text-xs text-ink-muted">{step}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Empty state and pagination">
        <EmptyState
          title="No results for “refrigerator”"
          body="Nothing matched that search. Check the spelling, or browse a category to see what is in stock."
        >
          <Button variant="secondary" size="sm">Browse Kitchen</Button>
          <Button variant="secondary" size="sm">Clear filters</Button>
        </EmptyState>
        <Pagination page={4} totalPages={9} buildHref={(p) => `/styleguide?page=${p}`} />
      </Section>
    </main>
  );
}
