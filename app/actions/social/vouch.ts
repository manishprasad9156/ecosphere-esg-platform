"use server"

import { revalidatePath } from "next/cache"
import { and, desc, eq, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  activityLogs,
  employeeParticipations,
  peerVerifications,
  user,
  wellbeingChallenges,
} from "@/lib/db/schema"
import { logger } from "@/lib/logger"
import { getSessionUser } from "@/lib/session"
import {
  REQUIRED_VOUCHES,
  VOUCH_APPROVAL_POINTS,
  vouchSchema,
} from "@/lib/social/validation"

/**
 * POST /api/social/vouch equivalent.
 *
 * Inside a single database transaction:
 * 1. Locks and validates the participation.
 * 2. Rejects self-vouching and duplicate vouches.
 * 3. Inserts the PeerVerification and increments vouch_count.
 * 4. At exactly REQUIRED_VOUCHES vouches, auto-approves and awards points.
 */
export async function vouchForParticipation(input: { participationId: string }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return { error: "Unauthorized" }

  const parsed = vouchSchema.safeParse(input)
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  const { participationId } = parsed.data

  try {
    const result = await db.transaction(async (tx) => {
      // Lock the participation row to serialize concurrent vouches
      const [participation] = await tx
        .select()
        .from(employeeParticipations)
        .where(eq(employeeParticipations.id, participationId))
        .for("update")

      if (!participation) throw new VouchError("Participation not found")
      if (participation.employeeId === sessionUser.id)
        throw new VouchError("You cannot verify your own participation")
      if (participation.approvalStatus !== "pending")
        throw new VouchError("This participation has already been resolved")

      const [existing] = await tx
        .select({ id: peerVerifications.id })
        .from(peerVerifications)
        .where(
          and(
            eq(peerVerifications.participationId, participationId),
            eq(peerVerifications.voucherEmployeeId, sessionUser.id),
          ),
        )
      if (existing)
        throw new VouchError("You have already verified this participation")

      await tx.insert(peerVerifications).values({
        participationId,
        voucherEmployeeId: sessionUser.id,
      })

      const newVouchCount = participation.vouchCount + 1
      const approved = newVouchCount >= REQUIRED_VOUCHES

      const [updated] = await tx
        .update(employeeParticipations)
        .set({
          vouchCount: newVouchCount,
          ...(approved
            ? {
                approvalStatus: "approved",
                pointsEarned: VOUCH_APPROVAL_POINTS,
              }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(employeeParticipations.id, participationId))
        .returning()

      if (approved) {
        await tx
          .update(user)
          .set({
            pointsBalance: sql`${user.pointsBalance} + ${VOUCH_APPROVAL_POINTS}`,
          })
          .where(eq(user.id, participation.employeeId))
      }

      return { updated, approved }
    })

    logger.info("social.vouch.recorded", {
      participationId,
      voucherEmployeeId: sessionUser.id,
      vouchCount: result.updated.vouchCount,
      autoApproved: result.approved,
    })
    if (result.approved) {
      logger.info("social.participation.approved", {
        participationId,
        employeeId: result.updated.employeeId,
        pointsEarned: VOUCH_APPROVAL_POINTS,
      })
    }

    revalidatePath("/social")
    return { success: true, participation: result.updated, approved: result.approved }
  } catch (e) {
    if (e instanceof VouchError) return { error: e.message }
    logger.error("social.vouch.failed", {
      participationId,
      voucherEmployeeId: sessionUser.id,
      message: e instanceof Error ? e.message : String(e),
    })
    return { error: "Verification failed. Please try again." }
  }
}

class VouchError extends Error {}

/**
 * Pending participations from other employees that the current user can vouch for.
 */
export async function getVerificationFeed(limit = 30) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return []

  const rows = await db
    .select({
      id: employeeParticipations.id,
      employeeId: employeeParticipations.employeeId,
      employeeName: user.name,
      proofUrl: employeeParticipations.proofUrl,
      vouchCount: employeeParticipations.vouchCount,
      createdAt: employeeParticipations.createdAt,
      activityType: activityLogs.activityType,
      notes: activityLogs.notes,
      dateLogged: activityLogs.dateLogged,
      challengeName: wellbeingChallenges.name,
      alreadyVouched: sql<boolean>`EXISTS (
        SELECT 1 FROM "peer_verifications" pv
        WHERE pv."participationId" = ${employeeParticipations.id}
        AND pv."voucherEmployeeId" = ${sessionUser.id}
      )`,
    })
    .from(employeeParticipations)
    .innerJoin(user, eq(employeeParticipations.employeeId, user.id))
    .leftJoin(activityLogs, eq(employeeParticipations.activityId, activityLogs.id))
    .leftJoin(
      wellbeingChallenges,
      eq(activityLogs.challengeId, wellbeingChallenges.id),
    )
    .where(
      and(
        eq(employeeParticipations.approvalStatus, "pending"),
        eq(employeeParticipations.source, "activity"),
        ne(employeeParticipations.employeeId, sessionUser.id),
      ),
    )
    .orderBy(desc(employeeParticipations.createdAt))
    .limit(limit)

  return rows
}
