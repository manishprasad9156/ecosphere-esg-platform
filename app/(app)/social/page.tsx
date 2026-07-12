import { requireUser } from "@/lib/session"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSocialDashboard } from "@/app/actions/social/dashboard"
import { listWellbeingChallenges } from "@/app/actions/social/challenges"
import { getMyActivityLogs } from "@/app/actions/social/activity"
import { getVerificationFeed } from "@/app/actions/social/vouch"
import { DashboardTab } from "./_components/dashboard-tab"
import { ChallengesTab } from "./_components/challenges-tab"
import { LogActivityTab } from "./_components/log-activity-tab"
import { VerifyTab } from "./_components/verify-tab"
import { LayoutDashboard, Target, ClipboardList, UserCheck } from "lucide-react"

export default async function SocialPage() {
  const user = await requireUser()

  const [dashboard, challengeList, myLogs, feed] = await Promise.all([
    getSocialDashboard(),
    listWellbeingChallenges({ page: 1, pageSize: 50, status: "active" }),
    getMyActivityLogs(),
    getVerificationFeed(),
  ])

  const challenges =
    "items" in challengeList && challengeList.items ? challengeList.items : []

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Social &amp; Wellbeing
        </h1>
        <p className="mt-1 text-muted-foreground">
          Join wellbeing challenges, log activities, and verify your peers.
        </p>
      </header>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="size-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="challenges" className="flex items-center gap-2">
            <Target className="size-4" />
            Challenges
          </TabsTrigger>
          <TabsTrigger value="log" className="flex items-center gap-2">
            <ClipboardList className="size-4" />
            Log Activity
          </TabsTrigger>
          <TabsTrigger value="verify" className="flex items-center gap-2">
            <UserCheck className="size-4" />
            Verify Peers
            {feed.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                {feed.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab
            dashboard={"error" in dashboard ? null : dashboard}
            isAdmin={user.role === "admin"}
          />
        </TabsContent>
        <TabsContent value="challenges">
          <ChallengesTab
            initialChallenges={challenges}
            isAdmin={user.role === "admin"}
          />
        </TabsContent>
        <TabsContent value="log">
          <LogActivityTab challenges={challenges} myLogs={myLogs} />
        </TabsContent>
        <TabsContent value="verify">
          <VerifyTab feed={feed} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
