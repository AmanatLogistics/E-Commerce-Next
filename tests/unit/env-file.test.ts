import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { config as loadEnv } from "dotenv";
import { looksTruncated, quotingAdvice, readRawEnvValue } from "../../lib/env-file";

/**
 * Regression cover for the bug that made the admin unable to sign in.
 *
 * dotenv cuts an unquoted value at the first `#`, so `SEED_ADMIN_PASSWORD=MySecret#Pass123`
 * reaches the process as `MySecret`. The account was then created with a password nobody
 * typed, and the only symptom was "that email and password do not match" — no error, no
 * warning, nothing to go on. Most strong passwords contain a `#`.
 */

const dir = mkdtempSync(join(tmpdir(), "rec-env-"));
after(() => rmSync(dir, { recursive: true, force: true }));

let n = 0;
function envFile(contents: string): string {
  n += 1;
  const file = join(dir, `env-${n}`);
  writeFileSync(file, contents, "utf8");
  return file;
}

/** What dotenv itself makes of the file — the behaviour we are guarding against. */
function parse(file: string, key: string): string | undefined {
  const parsed = loadEnv({ path: file, processEnv: {} }).parsed ?? {};
  return parsed[key];
}

describe("env file: truncation detection", () => {
  it("dotenv really does cut an unquoted value at the hash", () => {
    const file = envFile("SEED_ADMIN_PASSWORD=MySecret#Pass123\n");
    assert.equal(parse(file, "SEED_ADMIN_PASSWORD"), "MySecret");
  });

  it("flags a value the environment cut short", () => {
    const file = envFile("SEED_ADMIN_PASSWORD=MySecret#Pass123\n");
    assert.equal(looksTruncated(file, "SEED_ADMIN_PASSWORD", parse(file, "SEED_ADMIN_PASSWORD")), true);
  });

  it("does not flag the same value once it is quoted", () => {
    for (const quote of ['"', "'"]) {
      const file = envFile(`SEED_ADMIN_PASSWORD=${quote}MySecret#Pass123${quote}\n`);
      assert.equal(parse(file, "SEED_ADMIN_PASSWORD"), "MySecret#Pass123");
      assert.equal(
        looksTruncated(file, "SEED_ADMIN_PASSWORD", parse(file, "SEED_ADMIN_PASSWORD")),
        false,
        `a ${quote}-quoted value must not be flagged`,
      );
    }
  });

  it("does not flag an ordinary value with no hash in it", () => {
    const file = envFile("SEED_ADMIN_PASSWORD=AdminPass123\n");
    assert.equal(looksTruncated(file, "SEED_ADMIN_PASSWORD", parse(file, "SEED_ADMIN_PASSWORD")), false);
  });

  it("reads the raw text, comment and all, and reports whether it was quoted", () => {
    const unquoted = envFile("SEED_ADMIN_PASSWORD=MySecret#Pass123\n");
    assert.deepEqual(readRawEnvValue(unquoted, "SEED_ADMIN_PASSWORD"), {
      raw: "MySecret#Pass123",
      quoted: false,
    });

    const quoted = envFile('SEED_ADMIN_PASSWORD="MySecret#Pass123"\n');
    assert.deepEqual(readRawEnvValue(quoted, "SEED_ADMIN_PASSWORD"), {
      raw: "MySecret#Pass123",
      quoted: true,
    });
  });

  it("ignores comment lines and other keys", () => {
    const file = envFile(
      ["# SEED_ADMIN_PASSWORD=commented-out", "OTHER=value", "SEED_ADMIN_PASSWORD=real"].join("\n"),
    );
    assert.equal(readRawEnvValue(file, "SEED_ADMIN_PASSWORD")?.raw, "real");
  });

  it("handles an exported line", () => {
    const file = envFile("export SEED_ADMIN_PASSWORD=MySecret#Pass123\n");
    assert.equal(readRawEnvValue(file, "SEED_ADMIN_PASSWORD")?.raw, "MySecret#Pass123");
  });

  it("returns null for a missing key or a missing file", () => {
    assert.equal(readRawEnvValue(envFile("A=1\n"), "MISSING"), null);
    assert.equal(readRawEnvValue(join(dir, "does-not-exist"), "ANY"), null);
    assert.equal(looksTruncated(join(dir, "does-not-exist"), "ANY", "value"), false);
  });

  it("suggests the exact quoted line to paste back", () => {
    assert.equal(
      quotingAdvice("SEED_ADMIN_PASSWORD", "MySecret#Pass123"),
      '  SEED_ADMIN_PASSWORD="MySecret#Pass123"',
    );
  });
});
