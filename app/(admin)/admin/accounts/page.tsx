import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import { listAdmins } from "@/lib/auth/admin-account";
import {
  deleteAccountAction,
  setAccountDisabledAction,
} from "@/lib/auth/account-actions";
import {
  ChangeOwnPasswordForm,
  CreateAccountForm,
  ResetAccountPasswordForm,
} from "@/components/admin/account-forms";
import { toAccountView } from "@/lib/view-models";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Accounts", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Staff accounts.
 *
 * requireAdmin() here is this page's own guard, not the layout's — and every action the
 * page posts to guards itself again, because a Server Action does not re-run either.
 */
export default async function AdminAccountsPage() {
  const me = await requireAdmin("/admin/accounts");
  const selfId = me._id.toHexString();
  const accounts = (await listAdmins()).map((user) => toAccountView(user, selfId));
  const enabledCount = accounts.filter((account) => !account.disabled).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-body text-h1 font-semibold">Accounts</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Everyone here can sign in and manage the whole shop — stones, varieties and
          enquiries alike. There is no lesser level of access, so only add people you would
          hand the keys to.
        </p>
      </div>

      <section className="rounded-[var(--radius-md)] border bg-surface p-5">
        <h2 className="text-h3 font-body">Add someone</h2>
        <div className="mt-4">
          <CreateAccountForm />
        </div>
      </section>

      <section className="rounded-[var(--radius-md)] border bg-surface p-5">
        <h2 className="text-h3 font-body">Change my password</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Signed in as {me.email}. Changing this signs you out on every other device and
          replaces whatever was set from your hosting environment.
        </p>
        <div className="mt-4">
          <ChangeOwnPasswordForm />
        </div>
      </section>

      <section>
        <h2 className="label-caps">Existing accounts</h2>
        <ul className="mt-3 flex flex-col gap-4">
          {accounts.map((account) => {
            /*
             * The last account that can still sign in cannot be suspended or deleted, and
             * you cannot do either to yourself. The actions refuse these too — this only
             * stops the button being offered for something that will not happen.
             */
            const lastWayIn = !account.disabled && enabledCount <= 1;
            const canSuspend = !account.isSelf && !lastWayIn;
            const canDelete = !account.isSelf && !lastWayIn;

            return (
              <li key={account.id} className="rounded-[var(--radius-md)] border bg-surface p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-h3 font-body">{account.name}</h3>
                  {account.isSelf && <Badge tone="neutral">You</Badge>}
                  <Badge tone={account.disabled ? "neutral" : "success"}>
                    {account.disabled ? "Suspended" : "Active"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {account.email} · added {account.createdAt}
                </p>

                {!account.isSelf && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium hover:text-accent">
                      Set a new password
                    </summary>
                    <div className="mt-4">
                      <ResetAccountPasswordForm
                        accountId={account.id}
                        email={account.email}
                      />
                    </div>
                  </details>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
                  {canSuspend && (
                    <form action={setAccountDisabledAction}>
                      <input type="hidden" name="accountId" value={account.id} />
                      <input
                        type="hidden"
                        name="disabled"
                        value={account.disabled ? "false" : "true"}
                      />
                      <Button type="submit" variant="secondary" size="sm">
                        {account.disabled ? "Restore access" : "Suspend"}
                      </Button>
                    </form>
                  )}

                  {canDelete && (
                    <form action={deleteAccountAction}>
                      <input type="hidden" name="accountId" value={account.id} />
                      <Button type="submit" variant="danger" size="sm">
                        Delete
                      </Button>
                    </form>
                  )}

                  <p className="text-sm text-ink-muted">
                    {account.isSelf
                      ? "You cannot suspend or delete the account you are signed in with."
                      : lastWayIn
                        ? "The only account that can still sign in, so it cannot be suspended or deleted."
                        : "Suspending keeps the account and ends its sessions; deleting removes it."}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
