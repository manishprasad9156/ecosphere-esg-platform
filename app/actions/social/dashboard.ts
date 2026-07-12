"use server"

import { and, eq, gte, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  activityLogs,
  employeeParticipations,
  peerVerifications,
  wellbeingChallenges,
} from "@/lib/db/schema"
import { getSessionUser } from "@/lib/session"

export type SocialDashboard = {
  totalPoints: number
  totalApprovedActivities: number
  pendingApprovals: number
  currentStreakDays: number
  completedChallenges: number
  vouchesGiven: number
  vouchesReceived: number
  streakRewardsEarned: number
}

/**
 * GET /api/social/dashboard/{employee_id} equivalent.
 * Employees can only view their own dashboard; admins can view anyone's.
 */
export async function getSocialDashboard(
  employeeId?: string,
): Promise<SocialDashboard | { error: string }> {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return { error: "Unauthorized" }

  const targetId = employeeId ?? sessionUser.id
  if (targetId !== sessionUser.id && sessionUser.role !== "admin")
    return { error: "Forbidden" }

  const [
    pointsRow,
    approvedRow,
    pendingRow,
    vouchesGivenRow,
    vouchesReceivedRow,
    streakRewardsRow,
    recentDates,
    completedRow,
  ] = await Promise.all([
    db
      .select({
        total: sql<number>`COALESCE(SUM(${employeeParticipations.pointsEarned}), 0)::int`,
      })
      .from(employeeParticipations)
      .where(
        and(
          eq(employeeParticipations.employeeId, targetId),
          eq(employeeParticipations.approvalStatus, "approved"),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeeParticipations)
      .where(
        and(
          eq(employeeParticipations.employeeId, targetId),
          eq(employeeParticipations.approvalStatus, "approved"),
          eq(employeeParticipations.source, "activity"),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeeParticipations)
      .where(
        and(
          eq(employeeParticipations.employeeId, targetId),
          eq(employeeParticipations.approvalStatus, "pending"),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(peerVerifications)
      .where(eq(peerVerifications.voucherEmployeeId, targetId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(peerVerifications)
      .innerJoin(
        employeeParticipations,
        eq(peerVerifications.participationId, employeeParticipations.id),
      )
      .where(eq(employeeParticipations.employeeId, targetId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(employeeParticipations)
      .where(
        and(
          eq(employeeParticipations.employeeId, targetId),
          eq(employeeParticipations.source, "weekly_streak"),
        ),
      ),
    db
      .selectDistinct({ dateLogged: activityLogs.dateLogged })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.employeeId, targetId),
          gte(
            activityLogs.dateLogged,
            sql`(CURRENT_DATE - INTERVAL '60 days')::date`,
          ),
        ),
      ),
    // Challenges where approved activity count >= target frequency
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(wellbeingChallenges)
      .where(
        sql`(
          SELECT count(*) FROM "activity_logs" al
          INNER JOIN "employee_participations" ep ON ep."activityId" = al."id"
          WHERE al."challengeId" = ${wellbeingChallenges.id}
          AND al."employeeId" = ${targetId}
          AND ep."approvalStatus" = 'approved'
        ) >= ${wellbeingChallenges.targetFrequency}`,
      ),
  ])

  return {
    totalPoints: pointsRow[0]?.total ?? 0,
    totalApprovedActivities: approvedRow[0]?.count ?? 0,
    pendingApprovals: pendingRow[0]?.count ?? 0,
    currentStreakDays: computeStreak(
      recentDates.map((r) => r.dateLogged),
    ),
    completedChallenges: completedRow[0]?.count ?? 0,
    vouchesGiven: vouchesGivenRow[0]?.count ?? 0,
    vouchesReceived: vouchesReceivedRow[0]?.count ?? 0,
    streakRewardsEarned: streakRewardsRow[0]?.count ?? 0,
  }
}

/**
 * Consecutive-day streak ending today or yesterday.
 */
function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0
  const set = new Set(dates)
  const today = new Date()
  const toKey = (d: Date) => d.toISOString().slice(0, 10)

  // Streak may end today or yesterday (user hasn't logged today yet)
  const cursor = new Date(today)
  if (!set.has(toKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!set.has(toKey(cursor))) return 0
  }

  let streak = 0
  while (set.has(toKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
