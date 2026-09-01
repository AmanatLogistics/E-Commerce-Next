import "server-only";
import { compare, hash } from "bcryptjs";

/**
 * Cost 12: comfortably above the 2026 baseline while staying fast enough that a login
 * round trip is not user-visible.
 */
const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, COST);
}

export function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return compare(plain, passwordHash);
}
