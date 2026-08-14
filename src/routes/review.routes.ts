import { Router } from "express";
import { Role } from "@prisma/client";
import * as reviewController from "@/controllers/review.controller";
import { authenticate, authorize } from "@/middlewares/auth.middleware";
import { validate, validateQuery } from "@/middlewares/validate";
import { createReviewBodySchema, reviewQuerySchema } from "@/validations/review.validation";

const router = Router();

// Customer-only — every review the caller has written (dashboard "My reviews").
// Registered ahead of "/" so it's never swallowed by the public list route.
router.get("/mine", authenticate, authorize(Role.CUSTOMER), reviewController.mine);

// Public — GET /reviews?serviceId=... or GET /reviews?providerId=...
router.get("/", validateQuery(reviewQuerySchema), reviewController.list);

// Customer-only — tied to a completed booking the caller owns.
router.post("/", authenticate, authorize(Role.CUSTOMER), validate(createReviewBodySchema), reviewController.create);

export default router;
