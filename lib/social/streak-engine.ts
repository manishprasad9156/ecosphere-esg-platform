import "server-only"

import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import {
  STREAK_MIN_DISTINCT_DAYS,
  STREAK_REWARD_POINTS,
} from "@/lib/social/validation"

export type StreakRunResult = {
  weekStart: string
  weekEnd: string
  eligible: number
  rewarded: number
  skipped: number
}

/**
 * Weekly Streak Reward Engine.
 *
 * Scans ActivityLog for the previous 7 days, groups by employee, and counts
 * DISTINCT activity dates. Employees with >= STREAK_MIN_DISTINCT_DAYS distinct
 * days receive an auto-approved EmployeeParticipation worth
 * STREAK_REWARD_POINTS points. Duplicate weekly rewards are prevented by the
 * (employeeId, source, weekStart) unique constraint plus ON CONFLICT DO NOTHING.
 */
export async function runWeeklyStreakEngine(): Promise<StreakRunResult> {
  const startedAt = Date.now()
  logger.info("social.streak_engine.started", {})

  const result = await db.transaction(async (tx) => {
    // Window: the 7 days ending today (inclusive)
    const window = await tx.execute(sql`
      SELECT
        (CURRENT_DATE - INTERVAL '6 days')::date AS week_start,
        CURRENT_DATE::date AS week_end
    `)
    const weekStart = String(window.rows[0].week_start).slice(0, 10)
    const weekEnd = String(window.rows[0].week_end).slice(0, 10)

    const eligible = await tx.execute(sql`
      SELECT "employeeId", COUNT(DISTINCT "dateLogged")::int AS distinct_days
      FROM "activity_logs"
      WHERE "dateLogged" >= ${weekStart}::date
        AND "dateLogged" <= ${weekEnd}::date
      GROUP BY "employeeId"
      HAVING COUNT(DISTINCT "dateLogged") >= ${STREAK_MIN_DISTINCT_DAYS}
    `)

    let rewarded = 0
    for (const row of eligible.rows) {
      const employeeId = row.employeeId as string

      const inserted = await tx.execute(sql`
        INSERT INTO "employee_participations"
          ("employeeId", "approvalStatus", "pointsEarned", "source", "weekStart")
        VALUES
          (${employeeId}, 'approved', ${STREAK_REWARD_POINTS}, 'weekly_streak', ${weekStart}::date)
        ON CONFLICT ("employeeId", "source", "weekStart") DO NOTHING
        RETURNING "id"
      `)

      if (inserted.rows.length > 0) {
        await tx.execute(sql`
          UPDATE "user"
          SET "pointsBalance" = "pointsBalance" + ${STREAK_REWARD_POINTS}
          WHERE "id" = ${employeeId}
        `)
        rewarded++
        logger.info("social.streak_engine.rewarded", {
          employeeId,
          weekStart,
          points: STREAK_REWARD_POINTS,
          distinctDays: row.distinct_days,
        })
      }
    }

    return {
      weekStart,
      weekEnd,
      eligible: eligible.rows.length,
      rewarded,
      skipped: eligible.rows.length - rewarded,
    }
  })

  logger.info("social.streak_engine.completed", {
    ...result,
    durationMs: Date.now() - startedAt,
  })
  return result
}
