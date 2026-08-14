import { Router } from "express";
import { Role } from "@prisma/client";
import * as categoryController from "@/controllers/category.controller";
import { authenticate, authorize } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate";
import { categoryBodySchema, categoryUpdateBodySchema } from "@/validations/category.validation";

const router = Router();

router.get("/", categoryController.list);

// Admin-only catalog management — powers the admin dashboard's Categories tab.
router.post(
  "/",
  authenticate,
  authorize(Role.ADMIN),
  validate(categoryBodySchema),
  categoryController.create,
);
router.patch(
  "/:id",
  authenticate,
  authorize(Role.ADMIN),
  validate(categoryUpdateBodySchema),
  categoryController.update,
);
router.delete("/:id", authenticate, authorize(Role.ADMIN), categoryController.remove);

export default router;
