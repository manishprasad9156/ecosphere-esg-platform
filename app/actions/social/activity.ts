"use server"

import { revalidatePath } from "next/cache"
import { put } from "@vercel/blob"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  activityLogs,
  employeeParticipations,
  wellbeingChallenges,
} from "@/lib/db/schema"
import { logger } from "@/lib/logger"
import { getSessionUser } from "@/lib/session"
import { logActivitySchema, validateProofFile } from "@/lib/social/validation"

/**
 * POST /api/social/activity equivalent.
 * Logs an activity with an optional image proof (stored in Vercel Blob;
 * only the URL is persisted), and creates a pending participation record
 * awaiting peer verification.
 */
export async function logActivity(formData: FormData) {
  const user = await getSessionUser()
  if (!user) return { error: "Unauthorized" }

  const parsed = logActivitySchema.safeParse({
    challengeId: formData.get("challengeId"),
    activityType: formData.get("activityType"),
    notes: formData.get("notes") || undefined,
    dateLogged: formData.get("dateLogged"),
  })
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }

  const challenge = await db
    .select()
    .from(wellbeingChallenges)
    .where(eq(wellbeingChallenges.id, parsed.data.challengeId))
    .then((r) => r[0])
  if (!challenge) return { error: "Challenge not found" }
  if (!challenge.status) return { error: "Challenge is not active" }

  // Optional proof upload
  let proofUrl: string | null = null
  const proof = formData.get("proof")
  if (proof instanceof File && proof.size > 0) {
    const fileError = validateProofFile(proof)
    if (fileError) return { error: fileError }
    try {
      const blob = await put(`social-proofs/${user.id}/${proof.name}`, proof, {
        access: "public",
        addRandomSuffix: true,
      })
      proofUrl = blob.url
      logger.info("social.proof.uploaded", {
        employeeId: user.id,
        size: proof.size,
        type: proof.type,
      })
    } catch (e) {
      logger.error("social.proof.upload_failed", {
        employeeId: user.id,
        message: e instanceof Error ? e.message : String(e),
      })
      return { error: "Proof upload failed. Please try again." }
    }
  }

  const result = await db.transaction(async (tx) => {
    const [activity] = await tx
      .insert(activityLogs)
      .values({
        employeeId: user.id,
        challengeId: parsed.data.challengeId,
        activityType: parsed.data.activityType,
        notes: parsed.data.notes ?? null,
        proofUrl,
        dateLogged: parsed.data.dateLogged,
      })
      .returning()

    const [participation] = await tx
      .insert(employeeParticipations)
      .values({
        employeeId: user.id,
        activityId: activity.id,
        proofUrl,
        approvalStatus: "pending",
        source: "activity",
      })
      .returning()

    return { activity, participation }
  })

  logger.info("social.activity.logged", {
    employeeId: user.id,
    activityId: result.activity.id,
    participationId: result.participation.id,
    challengeId: parsed.data.challengeId,
  })

  revalidatePath("/social")
  return { success: true, ...result }
}

/**
 * Current user's recent activity logs with challenge names.
 */
export async function getMyActivityLogs(limit = 20) {
  const user = await getSessionUser()
  if (!user) return []

  return db
    .select({
      id: activityLogs.id,
      activityType: activityLogs.activityType,
      notes: activityLogs.notes,
      proofUrl: activityLogs.proofUrl,
      dateLogged: activityLogs.dateLogged,
      createdAt: activityLogs.createdAt,
      challengeName: wellbeingChallenges.name,
    })
    .from(activityLogs)
    .innerJoin(
      wellbeingChallenges,
      eq(activityLogs.challengeId, wellbeingChallenges.id),
    )
    .where(eq(activityLogs.employeeId, user.id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
}
