import { Router } from "express";
import healthRoutes from "@/routes/health.routes";
import authRoutes from "@/routes/auth.routes";
import serviceRoutes from "@/routes/service.routes";
import categoryRoutes from "@/routes/category.routes";
import bookingRoutes from "@/routes/booking.routes";
import reviewRoutes from "@/routes/review.routes";
import userRoutes from "@/routes/user.routes";
import providerRoutes from "@/routes/provider.routes";
import adminRoutes from "@/routes/admin.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/services", serviceRoutes);
router.use("/categories", categoryRoutes);
router.use("/bookings", bookingRoutes);
router.use("/reviews", reviewRoutes);
router.use("/users", userRoutes);
router.use("/provider", providerRoutes);
router.use("/admin", adminRoutes);

export default router;
