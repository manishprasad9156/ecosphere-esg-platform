import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { runWeeklyStreakEngine } from "@/lib/social/streak-engine"

export const dynamic = "force-dynamic"

/**
 * Vercel Cron endpoint — scheduled every Sunday at 23:59 (see vercel.json).
 * Protected by CRON_SECRET when set (Vercel sends it as a Bearer token).
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn("social.streak_engine.unauthorized_cron_call", {})
      return NextResponse.json(
        { success: false, message: "Unauthorized", error_code: "UNAUTHORIZED" },
        { status: 401 },
      )
    }
  }

  try {
    const result = await runWeeklyStreakEngine()
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    logger.error("social.streak_engine.failed", {
      message: e instanceof Error ? e.message : String(e),
    })
    return NextResponse.json(
      {
        success: false,
        message: "Streak engine failed",
        error_code: "STREAK_ENGINE_FAILURE",
      },
      { status: 500 },
    )
  }
}
