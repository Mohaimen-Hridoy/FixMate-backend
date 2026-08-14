import { Router } from "express";
import { Role } from "@prisma/client";
import * as serviceController from "@/controllers/service.controller";
import { authenticate, authorize } from "@/middlewares/auth.middleware";
import { validate, validateQuery } from "@/middlewares/validate";
import { serviceBodySchema, serviceQuerySchema, serviceUpdateBodySchema } from "@/validations/service.validation";

const router = Router();

// Public — matches queryServices' contract in the frontend's src/lib/api.ts.
router.get("/", validateQuery(serviceQuerySchema), serviceController.list);

// Public — unique service locations, for the Explore filter. Registered
// ahead of "/mine" and "/:slug" below so "/locations" is never swallowed.
router.get("/locations", serviceController.locations);

// Provider-only, gated to the caller's own ProviderProfile. Registered
// ahead of the public "/:slug" route below so "/mine" is never swallowed
// by it (Express matches routes in registration order).
router.get("/mine", authenticate, authorize(Role.PROVIDER), serviceController.mine);
router.get("/mine/:id", authenticate, authorize(Role.PROVIDER), serviceController.mineById);
router.post("/", authenticate, authorize(Role.PROVIDER), validate(serviceBodySchema), serviceController.create);
router.patch(
  "/mine/:id",
  authenticate,
  authorize(Role.PROVIDER),
  validate(serviceUpdateBodySchema),
  serviceController.update,
);
router.delete("/mine/:id", authenticate, authorize(Role.PROVIDER), serviceController.remove);

// Public — service detail + related services.
router.get("/:slug", serviceController.getBySlug);
router.get("/:slug/related", serviceController.related);

export default router;
