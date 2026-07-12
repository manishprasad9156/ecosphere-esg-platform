"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { triggerStreakEngine } from "@/app/actions/social/streak"
import type { SocialDashboard } from "@/app/actions/social/dashboard"
import {
  Award,
  CheckCircle2,
  Clock,
  Flame,
  HandHeart,
  Star,
  Trophy,
  Zap,
} from "lucide-react"

const stats: {
  key: keyof SocialDashboard
  label: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
}[] = [
  { key: "totalPoints", label: "Total Points", icon: Star, accent: "text-amber-500" },
  { key: "totalApprovedActivities", label: "Approved Activities", icon: CheckCircle2, accent: "text-emerald-500" },
  { key: "pendingApprovals", label: "Pending Approvals", icon: Clock, accent: "text-orange-500" },
  { key: "currentStreakDays", label: "Current Streak (days)", icon: Flame, accent: "text-red-500" },
  { key: "completedChallenges", label: "Completed Challenges", icon: Trophy, accent: "text-emerald-600" },
  { key: "vouchesGiven", label: "Vouches Given", icon: HandHeart, accent: "text-sky-500" },
  { key: "vouchesReceived", label: "Vouches Received", icon: Award, accent: "text-sky-600" },
  { key: "streakRewardsEarned", label: "Streak Rewards Earned", icon: Zap, accent: "text-amber-600" },
]

export function DashboardTab({
  dashboard,
  isAdmin,
}: {
  dashboard: SocialDashboard | null
  isAdmin: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [lastRun, setLastRun] = useState<string | null>(null)

  const handleRunEngine = () => {
    startTransition(async () => {
      const result = await triggerStreakEngine()
      if ("error" in result && result.error) {
        toast.error(result.error)
        return
      }
      if ("rewarded" in result) {
        setLastRun(
          `Week ${result.weekStart} to ${result.weekEnd}: ${result.eligible} eligible, ${result.rewarded} rewarded, ${result.skipped} already rewarded.`,
        )
        toast.success(`Streak engine complete: ${result.rewarded} employee(s) rewarded`)
      }
    })
  }

  if (!dashboard) {
    return (
      <p className="text-muted-foreground">Unable to load dashboard data.</p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.key}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <stat.icon className={`size-4 ${stat.accent}`} aria-hidden="true" />
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums text-foreground">
                {dashboard[stat.key]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Weekly Streak Reward Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Runs automatically every Sunday at 11:59 PM. Employees with
              activity on 5 or more distinct days in the past week earn an
              auto-approved 50-point reward. You can also trigger it manually.
            </p>
            <div className="flex items-center gap-3">
              <Button onClick={handleRunEngine} disabled={isPending} size="sm">
                {isPending ? "Running..." : "Run streak engine now"}
              </Button>
              {lastRun && (
                <p className="text-xs text-muted-foreground">{lastRun}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
