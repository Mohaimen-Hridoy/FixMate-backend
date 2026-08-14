import { Router } from "express";
import { Role } from "@prisma/client";
import * as bookingController from "@/controllers/booking.controller";
import { authenticate, authorize } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate";
import {
  cancelBookingBodySchema,
  createBookingBodySchema,
  updateBookingStatusBodySchema,
} from "@/validations/booking.validation";

const router = Router();

// Customer-facing — a booking is created by, listed for, and (before the
// provider starts the job) cancellable by the authenticated customer who
// made it.
router.post("/", authenticate, authorize(Role.CUSTOMER), validate(createBookingBodySchema), bookingController.create);
router.get("/mine", authenticate, authorize(Role.CUSTOMER), bookingController.mine);
router.get("/mine/:id", authenticate, authorize(Role.CUSTOMER), bookingController.mineById);
router.post(
  "/mine/:id/cancel",
  authenticate,
  authorize(Role.CUSTOMER),
  validate(cancelBookingBodySchema),
  bookingController.cancel,
);

// Provider-facing — bookings made against the caller's own services.
router.get("/provider", authenticate, authorize(Role.PROVIDER), bookingController.provider);
router.get("/provider/:id", authenticate, authorize(Role.PROVIDER), bookingController.providerById);
router.patch(
  "/provider/:id/status",
  authenticate,
  authorize(Role.PROVIDER),
  validate(updateBookingStatusBodySchema),
  bookingController.updateStatus,
);

export default router;
