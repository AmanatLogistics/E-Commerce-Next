/**
 * Reading raw values out of a .env file, to catch a specific and very costly footgun.
 *
 * dotenv treats `#` as the start of a comment in an *unquoted* value, so
 *
 *     SEED_ADMIN_PASSWORD=MySecret#Pass123
 *
 * is parsed as `MySecret`. The account is then created with a password nobody typed, and
 * the only symptom is "that email and password do not match" — with nothing anywhere
 * saying why. Most strong passwords contain a `#`, so this is not an edge case.
 *
 * These helpers compare the raw file text against what dotenv produced, so the tooling can
 * say plainly what happened instead of leaving someone to guess.
 */
import { existsSync, readFileSync } from "node:fs";

export interface RawEnvValue {
  /** The text after `KEY=`, exactly as written, with no comment stripping. */
  raw: string;
  /** Whether the author wrapped the value in single or double quotes. */
  quoted: boolean;
}

export function readRawEnvValue(file: string, key: string): RawEnvValue | null {
  if (!existsSync(file)) return null;

  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
    if (!match || match[1] !== key) continue;

    const value = match[2];
    const quoted = /^(['"]).*\1\s*$/.test(value);
    return { raw: quoted ? value.slice(1, value.lastIndexOf(value[0])) : value, quoted };
  }
  return null;
}

/**
 * True when the value in the file will reach the process shortened. The caller can then
 * refuse to write a password nobody meant to set.
 */
export function looksTruncated(file: string, key: string, parsed: string | undefined): boolean {
  const rawValue = readRawEnvValue(file, key);
  if (!rawValue || parsed === undefined) return false;
  if (rawValue.quoted) return false;
  return rawValue.raw.trim() !== parsed;
}

export function quotingAdvice(key: string, rawValue: string): string {
  return `  ${key}="${rawValue.trim()}"`;
}
