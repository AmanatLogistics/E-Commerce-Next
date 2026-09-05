import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

/**
 * The editable half of the site's identity.
 *
 * What matters here is the failure modes, not the happy path. The business name renders on
 * every page including ones that need no database at all, so this layer has to degrade
 * rather than throw, and a half-filled form must never blank the name across the site.
 */

const dir = mkdtempSync(join(tmpdir(), "aec-settings-"));
after(() => rmSync(dir, { recursive: true, force: true }));

let n = 0;

async function freshDb() {
  n += 1;
  process.env.REC_MEMORY_DB = join(dir, `db-${n}.json`);
  const settings = await import("../../lib/settings");
  const collections = await import("../../lib/db/collections");
  const { resetMemoryStoreForTests } = await import("../../lib/db/memory/store");
  resetMemoryStoreForTests();
  collections.resetCollectionCacheForTests();
  return { settings, collections };
}

describe("site settings", () => {
  it("falls back to the shipped defaults when nothing is stored", async () => {
    const { settings } = await freshDb();
    const { siteConfig } = await import("../../lib/site-config");

    const live = await settings.readSettingsForEditing();
    assert.equal(live.name, siteConfig.name);
    assert.equal(live.contactEmail, siteConfig.contactEmail);
    assert.equal(live.promises.length, siteConfig.promises.length);
  });

  it("an override replaces the default, and a reset brings it back", async () => {
    const { settings } = await freshDb();
    const { siteConfig } = await import("../../lib/site-config");

    await settings.saveSiteSettings({
      ...settings.defaultSettings(),
      name: "Kabul Stone House",
      contactPhone: "+93 70 000 0000",
    });

    let live = await settings.readSettingsForEditing();
    assert.equal(live.name, "Kabul Stone House");
    assert.equal(live.contactPhone, "+93 70 000 0000");
    // Fields that were not changed still come from the defaults.
    assert.equal(live.tagline, siteConfig.tagline);

    await settings.resetSiteSettings();
    live = await settings.readSettingsForEditing();
    assert.equal(live.name, siteConfig.name);
  });

  it("an empty stored field falls back rather than blanking the site", async () => {
    const { settings, collections } = await freshDb();
    const { siteConfig } = await import("../../lib/site-config");

    // A document written with a blank name — the shape a partial write would leave behind.
    await collections.settings().updateOne(
      { key: "site" },
      { $set: { ...settings.defaultSettings(), key: "site", name: "   ", updatedAt: new Date() } },
      { upsert: true },
    );

    const live = await settings.readSettingsForEditing();
    assert.equal(
      live.name,
      siteConfig.name,
      "a blank override must not erase the business name from every page",
    );
  });

  it("saving twice updates the one document rather than adding another", async () => {
    const { settings, collections } = await freshDb();

    await settings.saveSiteSettings({ ...settings.defaultSettings(), name: "First" });
    await settings.saveSiteSettings({ ...settings.defaultSettings(), name: "Second" });

    const all = await collections.settings().find({});
    assert.equal(all.length, 1, "settings are one row addressed by a constant key");
    assert.equal((await settings.readSettingsForEditing()).name, "Second");
  });
});

describe("the settings schema", () => {
  it("rejects an empty name and an over-long one", async () => {
    const { siteSettingsSchema } = await import("../../lib/validation/schemas");
    const { defaultSettings } = await import("../../lib/settings");
    const base = defaultSettings();

    assert.equal(siteSettingsSchema.safeParse({ ...base, name: "" }).success, false);
    assert.equal(siteSettingsSchema.safeParse({ ...base, name: "x".repeat(61) }).success, false);
    assert.equal(siteSettingsSchema.safeParse(base).success, true);
  });

  it("has no field that could set a role or any other privileged value", async () => {
    const { siteSettingsSchema } = await import("../../lib/validation/schemas");
    const { defaultSettings } = await import("../../lib/settings");

    const parsed = siteSettingsSchema.safeParse({
      ...defaultSettings(),
      role: "admin",
      currency: "USD",
      url: "https://elsewhere.example",
    });
    assert.equal(parsed.success, true);
    // Zod strips what the schema does not name, so the extra keys cannot reach the update.
    assert.equal("role" in parsed.data, false);
    assert.equal("currency" in parsed.data, false);
    assert.equal("url" in parsed.data, false);
  });
});
