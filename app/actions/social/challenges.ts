"use server"

import { revalidatePath } from "next/cache"
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { wellbeingChallenges } from "@/lib/db/schema"
import { logger } from "@/lib/logger"
import { getSessionUser } from "@/lib/session"
import {
  createChallengeSchema,
  listChallengesSchema,
} from "@/lib/social/validation"

export type ChallengeListParams = {
  page?: number
  pageSize?: number
  sortBy?: "name" | "createdAt" | "targetFrequency"
  sortOrder?: "asc" | "desc"
  cycleType?: "weekly" | "monthly"
  status?: "active" | "inactive"
  search?: string
}

/**
 * POST /api/social/challenges equivalent.
 * Admin-only: creates a wellbeing challenge.
 */
export async function createWellbeingChallenge(input: {
  name: string
  description?: string
  targetFrequency: number
  cycleType: "weekly" | "monthly"
}) {
  const user = await getSessionUser()
  if (!user) return { error: "Unauthorized" }
  if (user.role !== "admin")
    return { error: "Only admins can create challenges" }

  const parsed = createChallengeSchema.safeParse(input)
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const [challenge] = await db
    .insert(wellbeingChallenges)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      targetFrequency: parsed.data.targetFrequency,
      cycleType: parsed.data.cycleType,
      createdBy: user.id,
    })
    .returning()

  logger.info("social.challenge.created", {
    challengeId: challenge.id,
    createdBy: user.id,
  })

  revalidatePath("/social")
  return { success: true, challenge }
}

/**
 * GET /api/social/challenges equivalent.
 * Supports pagination, sorting, filtering, and search.
 */
export async function listWellbeingChallenges(params: ChallengeListParams = {}) {
  const user = await getSessionUser()
  if (!user) return { error: "Unauthorized" as const }

  const parsed = listChallengesSchema.safeParse(params)
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid parameters" }

  const { page, pageSize, sortBy, sortOrder, cycleType, status, search } =
    parsed.data

  const conditions: SQL[] = []
  if (cycleType) conditions.push(eq(wellbeingChallenges.cycleType, cycleType))
  if (status)
    conditions.push(eq(wellbeingChallenges.status, status === "active"))
  if (search) {
    const term = `%${search}%`
    conditions.push(
      or(
        ilike(wellbeingChallenges.name, term),
        ilike(wellbeingChallenges.description, term),
      )!,
    )
  }
  const where = conditions.length ? and(...conditions) : undefined

  const sortColumn =
    sortBy === "name"
      ? wellbeingChallenges.name
      : sortBy === "targetFrequency"
        ? wellbeingChallenges.targetFrequency
        : wellbeingChallenges.createdAt

  const [items, [{ count }]] = await Promise.all([
    db
      .select()
      .from(wellbeingChallenges)
      .where(where)
      .orderBy(sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(wellbeingChallenges)
      .where(where),
  ])

  return {
    items,
    page,
    pageSize,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
  }
}
