import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendSuccess } from "@/utils/ApiResponse";
import { ApiError } from "@/utils/ApiError";
import * as serviceService from "@/services/service.service";
import type { ServiceQuery } from "@/validations/service.validation";

export const list = asyncHandler(async (req: Request, res: Response) => {
  // req.query was already parsed+defaulted by validateQuery(serviceQuerySchema).
  const result = await serviceService.queryServices(req.query as unknown as ServiceQuery);
  return sendSuccess(res, 200, result);
});

export const locations = asyncHandler(async (_req: Request, res: Response) => {
  const items = await serviceService.listLocations();
  return sendSuccess(res, 200, { items });
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const service = await serviceService.getServiceBySlug(req.params.slug);
  return sendSuccess(res, 200, { service });
});

export const related = asyncHandler(async (req: Request, res: Response) => {
  const service = await serviceService.getServiceBySlug(req.params.slug);
  const items = await serviceService.getRelatedServices(service.category, service.id);
  return sendSuccess(res, 200, { items });
});

export const mine = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const items = await serviceService.getServicesByProvider(req.user.id);
  return sendSuccess(res, 200, { items });
});

export const mineById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const service = await serviceService.getOwnServiceById(req.user.id, req.params.id);
  return sendSuccess(res, 200, { service });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const service = await serviceService.createService(req.user.id, req.body);
  return sendSuccess(res, 201, { service });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  const service = await serviceService.updateService(req.user.id, req.params.id, req.body);
  return sendSuccess(res, 200, { service });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized("Authentication required");
  await serviceService.deleteService(req.user.id, req.params.id);
  return sendSuccess(res, 200, { deleted: true });
});
