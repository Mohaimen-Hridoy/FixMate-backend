import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { env, envConfigError, isProd } from "@/config/env";
import { requestLogger } from "@/middlewares/requestLogger";
import { errorHandler, notFoundHandler } from "@/middlewares/errorHandler";
import routes from "@/routes";

export function createApp(): Application {
  const app = express();

  // CORS — placed first so CORS headers are included even on early error responses
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowedOrigins = [
          env.CLIENT_URL,
          "http://localhost:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:3001",
        ];
        if (allowedOrigins.includes(origin) || allowedOrigins.includes(origin.replace(/\/$/, "")) || !isProd) {
          return callback(null, true);
        }
        return callback(null, origin);
      },
      credentials: true,
    }),
  );

  // Security headers
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  // Environment Configuration Guard
  app.use((_req, res, next) => {
    if (envConfigError) {
      res.status(500).json({
        success: false,
        error: "Environment Configuration Error",
        message:
          "Required environment variables are missing or invalid in Vercel. Please configure DATABASE_URL, JWT_ACCESS_SECRET, and JWT_REFRESH_SECRET in your Vercel Project Settings.",
        details: envConfigError,
      });
      return;
    }
    next();
  });

  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));
  app.use(cookieParser());
  app.use(compression());
  app.use(requestLogger);

  app.get("*", (req, res, next) => {
    if (req.path.startsWith(env.API_PREFIX)) {
      next();
      return;
    }
    res.json({ success: true, message: "FixMate API is running", docs: `${env.API_PREFIX}/health` });
  });




  app.use(env.API_PREFIX, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
