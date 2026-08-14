import { z } from "zod";

/**
 * Mirrors `loginSchema` in the Phase 10 frontend's `src/lib/validation.ts`
 * exactly, so the same form can be pointed at this endpoint with zero
 * schema drift between client and server validation.
 */
export const loginBodySchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").min(6, "Password must be at least 6 characters"),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

/**
 * Superset of the frontend's `registerSchema`: same name/email/password/
 * category rules, plus `role`, which the register form tracks as local
 * component state (the `I need a service` / `I provide a service` toggle)
 * rather than a registered form field today. Sent as lowercase to match
 * `dashboardByRole` in `src/app/login/page.tsx` — see `src/utils/role.ts`.
 */
export const registerBodySchema = z
  .object({
    name: z.string().min(2, "Enter your full name"),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    role: z.enum(["customer", "provider"]).default("customer"),
    category: z.string().optional(),
  })
  .refine((data) => data.role !== "provider" || !!data.category?.trim(), {
    message: "Choose a primary service category",
    path: ["category"],
  });
export type RegisterBody = z.infer<typeof registerBodySchema>;

export const googleAuthBodySchema = z.object({
  idToken: z.string().min(10, "Missing Google ID token"),
});
export type GoogleAuthBody = z.infer<typeof googleAuthBodySchema>;
