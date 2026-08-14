import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Google-only accounts still need a non-null `passwordHash` (schema
 * constraint), but the value must never be a guessable/loginable secret.
 * Hashing random bytes gives a row that satisfies the column and can never
 * match anything a user types on the login form.
 */
export function generateUnusablePasswordHash(): Promise<string> {
  const random = `${Date.now()}.${Math.random().toString(36).slice(2)}.${Math.random().toString(36).slice(2)}`;
  return bcrypt.hash(random, SALT_ROUNDS);
}
