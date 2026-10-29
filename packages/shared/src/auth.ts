import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  timezone: z.string().min(1).default("Europe/Istanbul"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  timezone: string;
};

export type AuthResponse = {
  token: string;
  user: PublicUser;
};
