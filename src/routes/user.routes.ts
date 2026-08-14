import { Router } from "express";
import * as userController from "@/controllers/user.controller";
import { authenticate } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate";
import { changePasswordBodySchema, updateProfileBodySchema } from "@/validations/profile.validation";

const router = Router();

// Any authenticated role — customer/provider/admin — can edit their own
// basic profile fields and change their own password.
router.patch("/me", authenticate, validate(updateProfileBodySchema), userController.updateMe);
router.patch("/me/password", authenticate, validate(changePasswordBodySchema), userController.changePassword);

export default router;
