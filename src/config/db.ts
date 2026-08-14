import { PrismaClient } from "@prisma/client";
import { isProd, env } from "@/config/env";
import { logger } from "@/config/logger";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function getPrismaClient(): PrismaClient {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: isProd ? ["error", "warn"] : ["query", "error", "warn"],
      ...(env.DATABASE_URL ? { datasources: { db: { url: env.DATABASE_URL } } } : {}),
    });
  }
  return global.__prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export async function connectDb(): Promise<void> {
  if (env.DATABASE_URL) {
    await prisma.$connect();
    logger.info("✅ Database connected");
  }
}

export async function disconnectDb(): Promise<void> {
  if (global.__prisma) {
    await global.__prisma.$disconnect();
    logger.info("Database disconnected");
  }
}

