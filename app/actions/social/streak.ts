"use server"

import { revalidatePath } from "next/cache"
import { logger } from "@/lib/logger"
import { getSessionUser } from "@/lib/session"
import { runWeeklyStreakEngine } from "@/lib/social/streak-engine"

/**
 * Admin-only manual trigger for the weekly streak reward engine
 * (the same logic Vercel Cron runs every Sunday at 23:59).
 */
export async function triggerStreakEngine() {
  const user = await getSessionUser()
  if (!user) return { error: "Unauthorized" }
  if (user.role !== "admin")
    return { error: "Only admins can run the streak engine" }

  try {
    const result = await runWeeklyStreakEngine()
    revalidatePath("/social")
    return { success: true, ...result }
  } catch (e) {
    logger.error("social.streak_engine.manual_failed", {
      triggeredBy: user.id,
      message: e instanceof Error ? e.message : String(e),
    })
    return { error: "Streak engine failed. Check logs." }
  }
}
