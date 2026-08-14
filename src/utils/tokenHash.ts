import { createHash } from "crypto";

/**
 * Refresh tokens are only ever stored as a hash (`RefreshToken.tokenHash`,
 * unique) — never the raw JWT — so a leaked database dump can't be replayed
 * as a session. SHA-256 (not bcrypt) is intentional here: we need an exact,
 * fast, *deterministic* lookup by hash on every /refresh call, not a
 * slow one-way comparison against a single candidate like a password.
 */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
