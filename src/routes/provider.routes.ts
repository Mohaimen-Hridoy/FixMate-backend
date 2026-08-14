import { Router } from "express";
import { Role } from "@prisma/client";
import * as providerController from "@/controllers/provider.controller";
import { authenticate, authorize } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate";
import { updateProviderProfileBodySchema } from "@/validations/profile.validation";

const router = Router();

// Provider-only, scoped to the caller's own ProviderProfile — powers the
// Provider dashboard's Profile and Earnings tabs.
router.get("/profile", authenticate, authorize(Role.PROVIDER), providerController.getProfile);
router.patch(
  "/profile",
  authenticate,
  authorize(Role.PROVIDER),
  validate(updateProviderProfileBodySchema),
  providerController.updateProfile,
);
router.get("/earnings", authenticate, authorize(Role.PROVIDER), providerController.earnings);

// Public — top-rated providers for the homepage. Registered ahead of the
// public "/:id" route below so "/featured" is never swallowed by it.
router.get("/featured", providerController.featured);

// Public — provider profile page (GET /provider/:id).
router.get("/:id", providerController.getPublicProfile);

export default router;
