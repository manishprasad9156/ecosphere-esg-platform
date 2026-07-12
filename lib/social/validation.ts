import { z } from "zod"

export const REQUIRED_VOUCHES = 3
export const VOUCH_APPROVAL_POINTS = 20
export const STREAK_REWARD_POINTS = 50
export const STREAK_MIN_DISTINCT_DAYS = 5

export const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
export const ACCEPTED_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const

export const createChallengeSchema = z.object({
  name: z.string().trim().min(1, "Challenge name is required").max(200),
  description: z.string().trim().max(2000).optional(),
  targetFrequency: z.coerce
    .number()
    .int("Frequency must be a whole number")
    .positive("Frequency must be greater than 0"),
  cycleType: z.enum(["weekly", "monthly"]),
})

export const logActivitySchema = z.object({
  challengeId: z.string().uuid("Invalid challenge id"),
  activityType: z.string().trim().min(1, "Activity type is required").max(200),
  notes: z.string().trim().max(2000).optional(),
  dateLogged: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
})

export const vouchSchema = z.object({
  participationId: z.string().uuid("Invalid participation id"),
})

export const listChallengesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["name", "createdAt", "targetFrequency"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  cycleType: z.enum(["weekly", "monthly"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  search: z.string().trim().max(200).optional(),
})

export function validateProofFile(file: File): string | null {
  if (file.size === 0) return "Proof file is empty"
  if (file.size > MAX_PROOF_SIZE_BYTES)
    return "Proof file must be 5 MB or smaller"
  if (!ACCEPTED_PROOF_TYPES.includes(file.type as (typeof ACCEPTED_PROOF_TYPES)[number]))
    return "Proof must be a JPEG, PNG, WebP, or GIF image"
  return null
}
