import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { Pagination } from "@/components/ui/pagination";
import { Checkbox, SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { GemPrice } from "@/components/gem/price";
import { GemStatusBadge } from "@/components/gem/status-badge";
import { formatMoney, toMinor } from "@/lib/money";
import { contrastRatio } from "@/lib/contrast";

export const metadata: Metadata = {
  title: "Style guide",
  robots: { index: false, follow: false },
};

/**
 * Every token and component state on one page, so the design system can be reviewed
 * independently of any screen. Contrast is computed here from the token values rather than
 * asserted, so a token change that breaks AA shows up immediately.
 */

const LIGHT = {
  surface: "#ffffff",
  "surface-sunken": "#faf7f2",
  plate: "#f2ede4",
  brand: "#0b4f3a",
  gold: "#b08d45",
  ink: "#1c1a17",
  "ink-muted": "#6b6459",
  line: "#e5ded2",
  success: "#1f7a4c",
  danger: "#a32b20",
} as const;

const DARK = {
  surface: "#14171a",
  "surface-sunken": "#101315",
  plate: "#1e2326",
  brand: "#4fae8b",
  gold: "#d3ad5f",
  ink: "#efe9de",
  "ink-muted": "#a49c8f",
  line: "#2b3033",
  success: "#4e9a6a",
  danger: "#d97066",
} as const;

const CONTRAST_PAIRS = [
  { label: "ink on surface", fg: LIGHT.ink, bg: LIGHT.surface, min: 4.5 },
  { label: "ink-muted on surface", fg: LIGHT["ink-muted"], bg: LIGHT.surface, min: 4.5 },
  { label: "white on brand (button)", fg: "#ffffff", bg: LIGHT.brand, min: 4.5 },
  { label: "gold on surface", fg: LIGHT.gold, bg: LIGHT.surface, min: 3 },
  { label: "ink on surface-sunken", fg: LIGHT.ink, bg: LIGHT["surface-sunken"], min: 4.5 },
  { label: "success on success-wash", fg: LIGHT.success, bg: "#e6f2eb", min: 4.5 },
  { label: "danger on danger-wash", fg: LIGHT.danger, bg: "#fbeae8", min: 4.5 },
  { label: "dark: ink on surface", fg: DARK.ink, bg: DARK.surface, min: 4.5 },
  { label: "dark: ink-muted on surface", fg: DARK["ink-muted"], bg: DARK.surface, min: 4.5 },
  { label: "dark: brand on surface", fg: DARK.brand, bg: DARK.surface, min: 4.5 },
];

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
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
              <p className="text-xs uppercase text-ink-muted">{hex}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12">
      <header>
        <h1 className="text-display">Style guide</h1>
        <p className="mt-3 max-w-prose text-ink-muted">
          Every token and component state in one place. Implements{" "}
          <code className="rounded-[var(--radius-sm)] bg-surface-sunken px-1">docs/DESIGN.md</code>.
A warm ivory ground, deep emerald as the brand colour, and gold reserved for
          emphasis. Switch your system to dark mode to review the dark palette.
        </p>
      </header>

      <Section
        title="Colour"
        note="A warm ivory ground, deep emerald as the brand, gold for emphasis only. --plate is the pale panel a stone photograph sits on."
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
                      <Badge tone={pass ? "success" : "danger"}>
                        {pass ? "Pass AA" : "Fails AA"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        title="Type scale"
        note="Cormorant Garamond for the wordmark, stone names and headings; Jost for everything factual."
      >
        <div className="flex flex-col gap-3">
          <p className="text-display">Display — Fine loose gemstones</p>
          <p className="text-h1 font-display">Heading 1 — Panjshir Emerald, 2.14 ct</p>
          <p className="text-h2 font-display">Heading 2 — Selected stones</p>
          <p className="text-h3 font-display">Heading 3 — Specification</p>
          <p className="text-body">
            Body — a step-cut rectangle chosen to hold weight and show the colour evenly
            across the table.
          </p>
          <p className="text-sm text-ink-muted">Small — treatment disclosed on every listing</p>
          <p className="label-caps">Label caps — used only for data labels</p>
          <div className="mt-2 rounded-[var(--radius-md)] border p-4">
            <p className="label-caps mb-2">Tabular figures line up</p>
            <table className="text-sm">
              <tbody>
                <tr><td className="pr-6">2.14 ct</td><td>{formatMoney(toMinor(185_000))}</td></tr>
                <tr><td className="pr-6">12.60 ct</td><td>{formatMoney(toMinor(1_250_000))}</td></tr>
                <tr><td className="pr-6">46.00 ct</td><td>{formatMoney(toMinor(88_000))}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      <Section title="Buttons" note="Emerald carries the primary action; the secondary is an outline, as the category expects.">
        <div className="flex flex-col gap-4">
          {(["primary", "secondary", "ghost", "danger"] as const).map((variant) => (
            <div key={variant} className="flex flex-wrap items-center gap-3">
              <span className="w-20 text-sm text-ink-muted">{variant}</span>
              <Button variant={variant} size="sm">Small</Button>
              <Button variant={variant}>Send enquiry</Button>
              <Button variant={variant} size="lg">Large</Button>
              <Button variant={variant} disabled>Disabled</Button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Form fields" note="Labels sit above the control and never vanish on focus.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Your name" placeholder="Ayesha Khan" autoComplete="name" required />
          <TextField label="Email" type="email" placeholder="you@example.com" autoComplete="email" required />
          <TextField label="Phone or WhatsApp" type="tel" hint="Optional." />
          <TextField label="Carat weight" type="number" inputMode="decimal" defaultValue="2.14" />
          <SelectField
            label="Status"
            options={[
              { value: "available", label: "Available" },
              { value: "reserved", label: "Reserved" },
              { value: "sold", label: "Sold" },
            ]}
          />
          <TextField label="Treatment" error="State the treatment, or “None (unheated)”" />
          <div className="sm:col-span-2">
            <TextAreaField label="Your message" placeholder="What would you like to know?" />
          </div>
          <div className="sm:col-span-2">
            <Checkbox label="Featured — show under “Selected stones”" defaultChecked />
          </div>
        </div>
      </Section>

      <Section title="Price and status" note="“Price on request” is a rendered state, not a blank.">
        <div className="flex flex-wrap items-center gap-6">
          <GemPrice priceMinor={toMinor(185_000)} />
          <GemPrice priceMinor={null} />
          <GemStatusBadge status="available" />
          <GemStatusBadge status="reserved" />
          <GemStatusBadge status="sold" />
          <Badge tone="accent">Untreated</Badge>
        </div>
      </Section>

      <Section title="Cards and elevation" note="Level 0 is a hairline border; shadow is only for floating layers.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader><h3 className="text-h3">Level 0</h3></CardHeader>
            <CardBody><p className="text-sm text-ink-muted">Cards, panels, the gem grid.</p></CardBody>
          </Card>
          <div className="rounded-[var(--radius-md)] border bg-surface-raised p-4 shadow-e1">
            <h3 className="text-h3">Level 1</h3>
            <p className="mt-1 text-sm text-ink-muted">Dropdowns and popovers.</p>
          </div>
          <div className="rounded-[var(--radius-lg)] border bg-surface-raised p-4 shadow-e2">
            <h3 className="text-h3">Level 2</h3>
            <p className="mt-1 text-sm text-ink-muted">Modals.</p>
          </div>
        </div>
      </Section>

      <Section title="The plate" note="Every stone photograph sits on --plate, a pale warm panel that lets a saturated stone read as merchandise.">
        <div className="flex flex-wrap gap-4">
          {["#2f7d5e", "#a33244", "#3f6ea8", "#c9a227"].map((colour) => (
            <div key={colour} className="size-32 rounded-[var(--radius-lg)] bg-plate p-6">
              <div className="size-full rounded-[var(--radius-sm)]" style={{ background: colour }} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Crest rule" note="A short gold rule under a section heading. The one ornament in the system, used sparingly.">
        <div className="text-center">
          <h3 className="text-h2 crest-rule crest-rule-center">Shop by variety</h3>
        </div>
      </Section>

      <Section title="Radius and spacing" note="Radius encodes what a thing is; spacing is a 4px scale.">
        <div className="flex flex-wrap items-end gap-6">
          {[
            ["sm — 2px", "var(--radius-sm)"],
            ["md — 4px", "var(--radius-md)"],
            ["lg — 8px", "var(--radius-lg)"],
            ["full", "var(--radius-full)"],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="size-16 border bg-surface-sunken" style={{ borderRadius: value }} />
              <span className="text-sm text-ink-muted">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
            <div key={step} className="flex flex-col items-center gap-2">
              <div
                className="bg-accent"
                style={{ width: `var(--space-${step})`, height: `var(--space-${step})` }}
              />
              <span className="text-xs text-ink-muted">{step}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Empty state and pagination">
        <EmptyState
          title="Nothing matches “diamond”"
          body="We do not currently list diamonds. Try a variety we carry, or tell us what you are looking for."
        >
          <Button variant="secondary" size="sm">Clear filters</Button>
          <Button variant="ghost" size="sm">Ask us to source it</Button>
        </EmptyState>
        <Pagination page={2} totalPages={5} buildHref={(p) => `/styleguide?page=${p}`} />
      </Section>
    </main>
  );
}
