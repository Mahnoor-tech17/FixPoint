import { z } from "zod";

// Single source of truth for password strength rules (frontend)
export const passwordRules = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "One uppercase letter (A-Z)", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter (a-z)", test: (p) => /[a-z]/.test(p) },
  { label: "One number (0-9)", test: (p) => /\d/.test(p) },
  { label: "One special character (! @ # $ ...)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be 100 characters or less")
  .regex(/[A-Z]/, "Password must include an uppercase letter (A-Z)")
  .regex(/[a-z]/, "Password must include a lowercase letter (a-z)")
  .regex(/\d/, "Password must include a number (0-9)")
  .regex(/[^A-Za-z0-9]/, "Password must include a special character (! @ # $ ...)");