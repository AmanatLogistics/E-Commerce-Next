/**
 * Turning a stone's title into the URL it lives at.
 *
 * The admin form used to ask for this, with the rule "lowercase words separated by hyphens"
 * written under the box. Everyone types the title — because that is what a slug LOOKS like
 * once it exists — and the save is refused with a message about hyphens that reads like a
 * riddle. It is a machine detail dressed up as a question, so the machine does it now.
 */

/**
 * "Panjshir Emerald, 3.42 ct" -> "panjshir-emerald-3-42-ct".
 *
 * Diacritics are folded rather than dropped, so "Néphrite" becomes "nephrite" instead of
 * "n-phrite". Anything still not a letter or a digit becomes a hyphen, and runs collapse.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    // Combining marks left behind by NFKD: "é" is now "e" + an accent to discard.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    // A trailing hyphen can reappear after the slice.
    .replace(/-+$/g, "");
}

/**
 * A slug nothing else is using.
 *
 * Two stones can honestly share a title — "Panjshir Emerald, Oval, 1.05 ct" is a
 * description, not a name — so a collision is ordinary rather than an error to report. The
 * second one becomes "…-2". `isTaken` is asked rather than passed a list, because the caller
 * knows whether to exclude the record being edited.
 */
export async function uniqueSlug(
  title: string,
  isTaken: (candidate: string) => Promise<boolean>,
  fallback = "stone",
): Promise<string> {
  const base = slugify(title) || fallback;
  if (!(await isTaken(base))) return base;

  // Bounded: at some point this is not a collision, it is a bug, and looping forever while
  // an administrator waits is the worst way to find out.
  for (let n = 2; n <= 200; n += 1) {
    const candidate = `${base}-${n}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  // Nothing sensible left to count to; a timestamp is ugly but it always ends.
  return `${base}-${Date.now().toString(36)}`;
}
