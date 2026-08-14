import { OAuth2Client } from "google-auth-library";
import ms from "ms";
import { Role, User } from "@prisma/client";
import { prisma } from "@/config/db";
import { env, isGoogleAuthEnabled } from "@/config/env";
import { ApiError } from "@/utils/ApiError";
import { comparePassword, generateUnusablePasswordHash, hashPassword } from "@/utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/utils/jwt";
import { hashToken } from "@/utils/tokenHash";
import { toDbRole } from "@/utils/role";
import { slugify } from "@/utils/slugify";
import { toPublicUser, type UserWithProfile } from "@/utils/sanitize";
import type { GoogleAuthBody, LoginBody, RegisterBody } from "@/validations/auth.validation";

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

export type AuthResult = {
  user: ReturnType<typeof toPublicUser>;
  accessToken: string;
  refreshToken: string;
};

function findUserWithProfile(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, include: { providerProfile: true } });
}

/**
 * Signs a fresh access+refresh pair and persists the refresh token's hash
 * (never the raw value) so /auth/refresh and /auth/logout can look it up,
 * revoke it, and detect reuse of an already-rotated token.
 */
async function issueTokenPair(user: Pick<User, "id" | "email" | "role">) {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const { token: refreshToken } = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN)),
    },
  });

  return { accessToken, refreshToken };
}

export async function registerUser(input: RegisterBody): Promise<AuthResult> {
  const dbRole = toDbRole(input.role);
  const passwordHash = await hashPassword(input.password);

  // Wrapped in a transaction so a PROVIDER row never ends up without its
  // ProviderProfile half if the second insert fails.
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name: input.name, email: input.email, passwordHash, role: dbRole },
    });

    if (dbRole === Role.PROVIDER) {
      await tx.providerProfile.create({
        data: {
          userId: created.id,
          businessName: input.name,
          avatarInitial: input.name.trim().charAt(0).toUpperCase() || "F",
          categorySlug: slugify(input.category ?? "general"),
          // The register form doesn't collect a bio yet (Part 3+ profile
          // editing will) — a clearly-a-placeholder default satisfies the
          // schema's 10-char minimum without pretending to be real copy.
          bio: "This provider hasn't written a bio yet.",
        },
      });
    }

    return created;
  });

  const withProfile = await findUserWithProfile(user.id);
  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(withProfile as UserWithProfile), ...tokens };
}

export async function loginUser(input: LoginBody): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { providerProfile: true },
  });

  // Same generic message whether the email doesn't exist or the password
  // is wrong — don't let the endpoint be used to enumerate registered emails.
  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
    throw ApiError.unauthorized("Invalid email or password");
  }
  if (user.status === "SUSPENDED") {
    throw ApiError.forbidden("This account has been suspended. Contact support for help.");
  }

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), ...tokens };
}

export async function refreshSession(rawRefreshToken: string | undefined): Promise<AuthResult> {
  if (!rawRefreshToken) {
    throw ApiError.unauthorized("No session found — please log in again");
  }

  const payload = verifyRefreshToken(rawRefreshToken);
  const tokenHash = hashToken(rawRefreshToken);

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.userId !== payload.sub) {
    throw ApiError.unauthorized("Invalid or expired session — please log in again");
  }

  const user = await findUserWithProfile(stored.userId);
  if (!user) {
    throw ApiError.unauthorized("Account no longer exists");
  }

  // Rotate: the presented token is single-use. Revoking it here means a
  // stolen-and-replayed refresh token stops working the moment the
  // legitimate client refreshes next, rather than staying valid for days.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), ...tokens };
}

export async function logoutUser(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;

  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function googleAuth(input: GoogleAuthBody): Promise<AuthResult> {
  if (!isGoogleAuthEnabled || !googleClient) {
    throw ApiError.badRequest("Google sign-in isn't configured on this server yet");
  }

  const ticket = await googleClient
    .verifyIdToken({ idToken: input.idToken, audience: env.GOOGLE_CLIENT_ID })
    .catch(() => {
      throw ApiError.unauthorized("Invalid Google ID token");
    });

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw ApiError.unauthorized("Google account has no verified email");
  }

  let user = await prisma.user.findUnique({ where: { email: payload.email }, include: { providerProfile: true } });

  if (!user) {
    const created = await prisma.user.create({
      data: {
        name: payload.name ?? payload.email.split("@")[0],
        email: payload.email,
        passwordHash: await generateUnusablePasswordHash(),
        role: Role.CUSTOMER,
        avatarUrl: payload.picture,
        isVerifiedEmail: payload.email_verified ?? true,
      },
    });
    user = { ...created, providerProfile: null };
  }

  const tokens = await issueTokenPair(user);
  return { user: toPublicUser(user), ...tokens };
}

export async function getMe(userId: string) {
  const user = await findUserWithProfile(userId);
  if (!user) {
    throw ApiError.notFound("User not found");
  }
  return toPublicUser(user);
}
