"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { checkImageSrc } from "@/lib/image-src";

/**
 * The photographs on a stone, either uploaded or linked.
 *
 * Both, not one or the other: a dealer who has the file on their phone wants to choose it,
 * and one whose photographs already live on a supplier's page wants to paste the address.
 * Making them pick a mode up front would be a question nobody should have to answer, so
 * every row does both and shows whichever ends up filled.
 *
 * The url is what gets submitted, in either case. An upload just fills the same field in
 * with the address it was stored at, which keeps the form's contract with the server to one
 * kind of value.
 */

interface Row {
  /** Stable across reorders and removals, so React does not reuse the wrong preview. */
  key: string;
  url: string;
  alt: string;
  /** Set while this row's file is in flight, or when the server refused it. */
  status: "idle" | "uploading" | "error";
  message: string;
}

const MAX_ROWS = 8;
/** Longest edge after downscaling. Big enough to zoom into a stone, small enough to send. */
const MAX_EDGE = 1600;

let nextKey = 0;
function makeRow(url = "", alt = ""): Row {
  nextKey += 1;
  return { key: `row-${nextKey}`, url, alt, status: "idle", message: "" };
}

/**
 * Shrink and re-encode in the browser before uploading.
 *
 * A photograph off a modern phone is 3-6MB and 4000px wide. Sending that intact wastes the
 * dealer's data, takes long enough on a slow connection that the form looks broken, and
 * stores forty times more than any page will ever display. Doing it here rather than on the
 * server also means the slow part happens on the device that is already idle.
 *
 * Falls back to the original file if anything about the canvas path fails — a smaller image
 * is an optimisation, not a requirement, and refusing the upload over it would be absurd.
 */
async function downscale(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_000_000) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.86),
    );
    // If re-encoding made it bigger — small PNGs sometimes do — keep the original.
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export function ImageFields({
  initial,
  error,
}: {
  initial: { url: string; alt: string }[];
  error?: string;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.length > 0 ? initial.map((image) => makeRow(image.url, image.alt)) : [makeRow()],
  );

  const update = useCallback((key: string, patch: Partial<Row>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }, []);

  const upload = useCallback(
    async (key: string, file: File) => {
      update(key, { status: "uploading", message: "Uploading…" });
      try {
        const body = new FormData();
        const blob = await downscale(file);
        body.append("file", new File([blob], file.name, { type: blob.type || file.type }));

        const response = await fetch("/api/admin/media", { method: "POST", body });
        const result = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !result.url) {
          update(key, { status: "error", message: result.error ?? "That upload failed." });
          return;
        }
        update(key, { url: result.url, status: "idle", message: "" });
      } catch {
        update(key, {
          status: "error",
          message: "That upload failed. Check your connection and try again.",
        });
      }
    },
    [update],
  );

  return (
    <fieldset className="rounded-[var(--radius-md)] border bg-surface p-5">
      <legend className="px-1">
        <span className="text-h3 font-body">Photographs</span>
      </legend>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">
        Upload a photograph from this device, or paste the address of one that is already
        online — either works, and you can mix them. The first one is the cover image.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {rows.map((row, index) => (
          <ImageRow
            key={row.key}
            row={row}
            index={index}
            canRemove={rows.length > 1}
            onChange={(patch) => update(row.key, patch)}
            onUpload={(file) => void upload(row.key, file)}
            onRemove={() =>
              setRows((current) =>
                current.length > 1 ? current.filter((r) => r.key !== row.key) : current,
              )
            }
          />
        ))}
      </ul>

      {rows.length < MAX_ROWS && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => setRows((current) => [...current, makeRow()])}
        >
          Add another photograph
        </Button>
      )}
    </fieldset>
  );
}

function ImageRow({
  row,
  index,
  canRemove,
  onChange,
  onUpload,
  onRemove,
}: {
  row: Row;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<Row>) => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(true);

  const verdict = row.url.trim().length > 0 ? checkImageSrc(row.url) : null;
  const showPreview = preview && verdict?.ok === true;

  return (
    <li className="grid gap-4 rounded-[var(--radius-md)] border bg-surface-sunken p-4 sm:grid-cols-[7rem_1fr]">
      {/* The thumbnail doubles as the upload target: clicking the empty frame opens the
          picker, which is where people try to click anyway. */}
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        aria-label={`Upload photograph ${index + 1} from this device`}
        className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-dashed border-line-strong bg-plate transition-colors hover:border-brand sm:w-28"
      >
        {showPreview ? (
          /* eslint-disable-next-line @next/next/no-img-element --
             A preview of an address the dealer just typed, which may point anywhere. Running
             it through the optimizer would make the server fetch it. */
          <img
            src={row.url}
            alt=""
            className="size-full object-cover"
            onError={() => setPreview(false)}
          />
        ) : (
          <span className="px-2 text-center text-xs text-ink-muted">
            {row.status === "uploading" ? "Uploading…" : "Click to upload"}
          </span>
        )}
      </button>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            setPreview(true);
            onUpload(file);
          }
          // Clear it, or choosing the same file twice in a row fires no change event.
          event.target.value = "";
        }}
      />

      <div className="flex flex-col gap-3">
        <TextField
          label={index === 0 ? "Cover photograph" : `Photograph ${index + 1}`}
          name="imageUrl"
          value={row.url}
          onChange={(event) => {
            setPreview(true);
            onChange({ url: event.target.value, status: "idle", message: "" });
          }}
          placeholder="https://… or click the frame to upload"
          error={
            row.status === "error"
              ? row.message
              : verdict && !verdict.ok
                ? verdict.reason
                : undefined
          }
        />
        <TextField
          label="Description"
          name="imageAlt"
          value={row.alt}
          onChange={(event) => onChange({ alt: event.target.value })}
          placeholder="Optional"
          hint="Read aloud by screen readers. Left blank, the stone's title is used."
        />

        {canRemove && (
          <div>
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              Remove this photograph
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
