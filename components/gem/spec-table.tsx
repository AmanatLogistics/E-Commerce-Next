import type { GemDoc } from "@/lib/db/documents";

/**
 * The specification table is the substance of a stone listing — a buyer compares on these
 * fields and nothing else. Empty optional fields are dropped; treatment never is.
 */
export function GemSpecTable({ gem }: { gem: GemDoc }) {
  const { length, width, depth } = gem.dimensionsMm;

  /*
   * Cut and clarity are optional, so a row with nothing in it is dropped rather than shown
   * empty. Plenty of stock has neither honestly: an uncut crystal has no cut, and a
   * translucent specimen has no clarity grade worth stating. A blank row invites the reader
   * to wonder what is being withheld.
   *
   * Treatment is NEVER dropped, even when it is "none" — disclosure is a trade obligation,
   * and "untreated" is itself the selling point.
   */
  const rows = [
    { label: "Reference", value: gem.reference },
    { label: "Carat weight", value: `${gem.caratWeight.toFixed(2)} ct` },
    { label: "Shape", value: gem.shape },
    { label: "Cut", value: gem.cut },
    { label: "Colour", value: gem.colour },
    { label: "Clarity", value: gem.clarity },
    {
      label: "Dimensions",
      value: `${length.toFixed(2)} × ${width.toFixed(2)} × ${depth.toFixed(2)} mm`,
    },
    { label: "Origin", value: gem.origin },
    // Kept in place rather than appended, so it reads next to origin where a buyer expects
    // it — and kept even when empty would have dropped it.
    { label: "Treatment", value: gem.treatment, always: true },
    { label: "Certification", value: gem.certificate },
  ].filter((row: { label: string; value: string; always?: boolean }) => row.always === true || String(row.value ?? "").trim().length > 0);

  return (
    <table className="w-full text-left">
      <caption className="sr-only">Specifications for {gem.title}</caption>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b last:border-0">
            <th scope="row" className="label-caps w-44 py-3 pr-4 align-top font-medium">
              {row.label}
            </th>
            <td className="py-3 align-top text-body">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
