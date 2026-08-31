/**
 * Public feature flags. Safe to import from client components — these are all
 * NEXT_PUBLIC_ values and none of them is a secret.
 */
export const flags = {
  /** v1 ships cash on delivery. The Stripe test-mode card path is off by default. */
  cardPayments: process.env.NEXT_PUBLIC_ENABLE_CARD_PAYMENTS === "true",
} as const;
