import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendSuccess } from "@/utils/ApiResponse";
import * as categoryService from "@/services/category.service";
import type { CategoryBody, CategoryUpdateBody } from "@/validations/category.validation";

/**
 * Read-only. `Category.count` is kept in sync by the Services module
 * (bumped on create/update/delete — see service.service.ts) rather than
 * computed here, so this is a plain findMany.
 */
export const list = asyncHandler(async (_req: Request, res: Response) => {
  const items = await categoryService.listCategories();
  return sendSuccess(res, 200, { items });
});

/** Admin-only — mirrors the "+ Add category" form on the admin dashboard. */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.createCategory(req.body as CategoryBody);
  return sendSuccess(res, 201, { category });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const category = await categoryService.updateCategory(req.params.id, req.body as CategoryUpdateBody);
  return sendSuccess(res, 200, { category });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await categoryService.deleteCategory(req.params.id);
  return sendSuccess(res, 200, { deleted: true });
});
