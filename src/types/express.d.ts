import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      /** Set by `authenticate` (src/middlewares/auth.middleware.ts) after verifying the access token. */
      user?: {
        id: string;
        email: string;
        role: Role;
      };
    }
  }
}

export {};
