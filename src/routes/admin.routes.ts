import { Router } from "express";
import { Role } from "@prisma/client";
import * as adminController from "@/controllers/admin.controller";
import { authenticate, authorize } from "@/middlewares/auth.middleware";
import { validate, validateQuery } from "@/middlewares/validate";
import {
  adminBookingQuerySchema,
  adminProviderQuerySchema,
  adminReviewQuerySchema,
  adminServiceQuerySchema,
  adminServiceUpdateBodySchema,
  adminUserQuerySchema,
  setProviderVerifiedBodySchema,
  updateUserStatusBodySchema,
} from "@/validations/admin.validation";

const router = Router();

// Every route below is admin-only — mounted at /admin, powering the admin
// dashboard's Users/Providers/Services/Bookings/Reviews/Analytics tabs.
router.use(authenticate, authorize(Role.ADMIN));

router.get("/users", validateQuery(adminUserQuerySchema), adminController.listUsers);
router.patch("/users/:id/status", validate(updateUserStatusBodySchema), adminController.setUserStatus);

router.get("/providers", validateQuery(adminProviderQuerySchema), adminController.listProviders);
router.patch("/providers/:id/verify", validate(setProviderVerifiedBodySchema), adminController.setProviderVerified);

router.get("/services", validateQuery(adminServiceQuerySchema), adminController.listServices);
router.patch(
  "/services/:id",
  validate(adminServiceUpdateBodySchema),
  adminController.setServiceAvailability,
);
router.delete("/services/:id", adminController.deleteService);

router.get("/bookings", validateQuery(adminBookingQuerySchema), adminController.listBookings);

router.get("/reviews", validateQuery(adminReviewQuerySchema), adminController.listReviews);
router.delete("/reviews/:id", adminController.deleteReview);

router.get("/analytics", adminController.analytics);

export default router;
