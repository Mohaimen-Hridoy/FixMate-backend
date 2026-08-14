import { Router } from "express";
import * as authController from "@/controllers/auth.controller";
import { authenticate } from "@/middlewares/auth.middleware";
import { authLimiter } from "@/middlewares/rateLimiter";
import { validate } from "@/middlewares/validate";
import { googleAuthBodySchema, loginBodySchema, registerBodySchema } from "@/validations/auth.validation";

const router = Router();

router.post("/register", authLimiter, validate(registerBodySchema), authController.register);
router.post("/login", authLimiter, validate(loginBodySchema), authController.login);
router.post("/google", authLimiter, validate(googleAuthBodySchema), authController.google);

// Cookie-authenticated, not rate-limited alongside the credential endpoints above.
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

router.get("/me", authenticate, authController.me);

export default router;
