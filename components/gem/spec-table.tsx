import type { GemDoc } from "@/lib/db/documents";

/**
 * The specification table is the substance of a stone listing — a buyer compares on these
 * fields and nothing else. Treatment is always shown, never omitted when it is "none":
 * disclosure is a trade obligation, and "untreated" is itself a selling point.
 */
export function GemSpecTable({ gem }: { gem: GemDoc }) {
  const { length, width, depth } = gem.dimensionsMm;

  const rows: { label: string; value: string }[] = [
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
    { label: "Treatment", value: gem.treatment },
  ];

  if (gem.certificate) rows.push({ label: "Certification", value: gem.certificate });

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
