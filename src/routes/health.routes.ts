import { Router } from "express";
import { prisma } from "@/config/db";
import { sendSuccess } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    let dbStatus: "up" | "down" = "up";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "down";
    }

    return sendSuccess(res, 200, {
      status: "ok",
      db: dbStatus,
      timestamp: new Date().toISOString(),
    });
  }),
);

export default router;
