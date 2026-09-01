import { Badge } from "@/components/ui/badge";
import type { GemStatus } from "@/lib/db/documents";

const LABELS: Record<GemStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
};

const TONES: Record<GemStatus, "success" | "accent" | "neutral"> = {
  available: "success",
  reserved: "accent",
  sold: "neutral",
};

/** A stone is a single object: it is on offer, held for someone, or gone. */
export function GemStatusBadge({ status }: { status: GemStatus }) {
  return <Badge tone={TONES[status]}>{LABELS[status]}</Badge>;
}

/** True when the stone can still be enquired about. */
export function isEnquirable(status: GemStatus): boolean {
  return status !== "sold";
}
