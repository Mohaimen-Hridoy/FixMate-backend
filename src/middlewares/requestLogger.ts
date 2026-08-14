import morgan from "morgan";
import { logger } from "@/config/logger";
import { isProd } from "@/config/env";

export const requestLogger = morgan(isProd ? "combined" : "dev", {
  stream: {
    write: (message: string) => logger.http?.(message.trim()) ?? logger.info(message.trim()),
  },
});
