/**
 * Create, update or inspect the admin account.
 *
 *   npm run admin                                    # from .env.local / .env
 *   npm run admin -- --email a@b.com --password 'x'  # explicit, bypasses .env parsing
 *   npm run admin -- --check                         # what accounts exist, and why login fails
 *
 * This exists because the only other way to set the admin password was `npm run seed`,
 * which clears the collections and would throw away every enquiry received so far.
 * Changing a password must not cost a dealer their leads.
 *
 * Passing --password is also the reliable route: a value typed on the command line is not
 * put through dotenv, so a `#` in it cannot be silently cut off.
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

const ENV_FILES = [".env.local", ".env"];

interface Args {
  email?: string;
  password?: string;
  name?: string;
  check: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { check: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const take = () => argv[++i];
    if (arg === "--check") args.check = true;
    else if (arg === "--email") args.email = take();
    else if (arg === "--password") args.password = take();
    else if (arg === "--name") args.name = take();
    else if (arg.startsWith("--email=")) args.email = arg.slice(8);
    else if (arg.startsWith("--password=")) args.password = arg.slice(11);
    else if (arg.startsWith("--name=")) args.name = arg.slice(7);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Imported after dotenv so lib/env.ts observes the loaded variables.
  const { env } = await import("../lib/env");
  const { listAdmins, upsertAdmin } = await import("../lib/auth/admin-account");
  const { usingMemoryDriver, ensureIndexes } = await import("../lib/db/collections");
  const { passwordSchema, emailSchema } = await import("../lib/validation/schemas");
  const { looksTruncated, quotingAdvice, readRawEnvValue } = await import("../lib/env-file");

  const where = usingMemoryDriver
    ? `the in-memory driver at ${env.memoryDbFile}`
    : `MongoDB database "${env.mongodbDb}"`;

  if (args.check) {
    const admins = await listAdmins();
    console.log(`\nAccounts in ${where}:\n`);
    if (admins.length === 0) {
      console.log("  (none)\n");
      console.log("  No account exists yet. Create one with:");
      console.log("    npm run admin -- --email you@example.com --password 'YourPassword123'\n");
    } else {
      for (const admin of admins) {
        console.log(`  ${admin.email}  role=${admin.role}  disabled=${admin.disabled}`);
      }
      console.log(`\n  Sign in at /login with one of the addresses above.`);
      console.log(`  The address configured in your environment is: ${env.seedAdminEmail}`);
      if (!admins.some((a) => a.email === env.seedAdminEmail.toLowerCase())) {
        console.log(
          "\n  ⚠ That configured address does not match any account above. Changing\n" +
            "    SEED_ADMIN_EMAIL does not rename an existing account — run\n" +
            "    `npm run admin` to create or update one.",
        );
      }
      console.log();
    }

    // The quoting footgun is the most common reason a correct-looking password fails.
    for (const file of ENV_FILES) {
      for (const key of ["SEED_ADMIN_PASSWORD", "AUTH_SECRET"]) {
        if (looksTruncated(file, key, process.env[key])) {
          const raw = readRawEnvValue(file, key)!;
          console.log(`  ⚠ ${key} in ${file} is being cut short.`);
          console.log(`    In the file : ${raw.raw}`);
          console.log(`    Actually read: ${process.env[key]}`);
          console.log(`    An unquoted # starts a comment. Quote it:`);
          console.log(`${quotingAdvice(key, raw.raw)}\n`);
        }
      }
    }
    return;
  }

  const email = args.email ?? env.seedAdminEmail;
  const password = args.password ?? env.seedAdminPassword;
  const fromEnv = args.password === undefined;

  // Refuse to store a password that the environment file mangled on the way in.
  if (fromEnv) {
    for (const file of ENV_FILES) {
      if (looksTruncated(file, "SEED_ADMIN_PASSWORD", process.env.SEED_ADMIN_PASSWORD)) {
        const raw = readRawEnvValue(file, "SEED_ADMIN_PASSWORD")!;
        console.error(`\n✗ SEED_ADMIN_PASSWORD in ${file} is being cut short.\n`);
        console.error(`  In the file  : ${raw.raw}`);
        console.error(`  Actually read: ${process.env.SEED_ADMIN_PASSWORD}\n`);
        console.error("  An unquoted # starts a comment in a .env file. Either quote it:\n");
        console.error(`${quotingAdvice("SEED_ADMIN_PASSWORD", raw.raw)}\n`);
        console.error("  or pass it directly, which skips .env parsing entirely:\n");
        console.error(`    npm run admin -- --password '${raw.raw}'\n`);
        process.exit(1);
      }
    }
  }

  const parsedEmail = emailSchema.safeParse(email);
  if (!parsedEmail.success) {
    console.error(`\n✗ ${parsedEmail.error.issues[0]?.message ?? "That email is not valid."}\n`);
    process.exit(1);
  }

  // The same rules the app would enforce, so a weak or mangled password is caught here
  // rather than becoming an account nobody can sign in to.
  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) {
    console.error("\n✗ That password will not do:\n");
    for (const issue of parsedPassword.error.issues) console.error(`  · ${issue.message}`);
    console.error(
      "\n  Set SEED_ADMIN_PASSWORD in .env.local (quoted), or pass --password 'YourPassword123'.\n",
    );
    process.exit(1);
  }

  await ensureIndexes();
  const result = await upsertAdmin(parsedEmail.data, parsedPassword.data, args.name);

  console.log(`\n✓ Admin ${result.created ? "created" : "updated"} in ${where}.\n`);
  console.log(`  Email    : ${result.email}`);
  console.log(`  Password : ${"•".repeat(Math.min(parsedPassword.data.length, 24))}`);
  console.log(`\n  Sign in at /login. ${result.created ? "" : "Any existing session was signed out."}\n`);

  if (!usingMemoryDriver) {
    const { closeMongo } = await import("../lib/db/mongo");
    await closeMongo();
  }
}

main().catch((error) => {
  console.error("\n✗ Could not set the admin account:", error);
  process.exit(1);
});
