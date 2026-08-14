import { createApp } from "@/app";
import { env } from "@/config/env";
import { connectDb, disconnectDb } from "@/config/db";
import { logger } from "@/config/logger";

async function bootstrap() {
  await connectDb();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 FixMate API listening on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`   → http://localhost:${env.PORT}${env.API_PREFIX}/health`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    // Force-exit if close hangs
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection:", reason);
  });
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception:", err);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
