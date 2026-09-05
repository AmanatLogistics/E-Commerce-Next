"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/gems", label: "Stones", exact: false },
  { href: "/admin/categories", label: "Varieties", exact: false },
  { href: "/admin/enquiries", label: "Enquiries", exact: false },
  { href: "/admin/accounts", label: "Accounts", exact: false },
  { href: "/admin/settings", label: "Site details", exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="border-t">
      <ul className="no-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3">
        {LINKS.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center border-b-2 px-3 text-sm",
                  active
                    ? "border-brand font-medium text-ink"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
