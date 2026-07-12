"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { vouchForParticipation } from "@/app/actions/social/vouch"
import { CheckCircle2, HandHeart, UserCheck } from "lucide-react"

type FeedItem = {
  id: string
  employeeId: string
  employeeName: string
  proofUrl: string | null
  vouchCount: number
  createdAt: Date
  activityType: string | null
  notes: string | null
  dateLogged: string | null
  challengeName: string | null
  alreadyVouched: boolean
}

export function VerifyTab({ feed }: { feed: FeedItem[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleVouch = (participationId: string) => {
    setPendingId(participationId)
    startTransition(async () => {
      const result = await vouchForParticipation({ participationId })
      setPendingId(null)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.approved) {
        toast.success("Third vouch received — participation auto-approved and points awarded!")
      } else {
        toast.success("Vouch recorded. Thanks for verifying your peer.")
      }
      router.refresh()
    })
  }

  if (feed.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <UserCheck className="size-10 text-muted-foreground" aria-hidden="true" />
        <p className="text-muted-foreground">
          No pending activities to verify right now.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Verify activities logged by your colleagues. An activity is
        automatically approved after 3 vouches and points are awarded.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {feed.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-3 pt-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.employeeName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.activityType ?? "Activity"}
                    {item.challengeName ? ` · ${item.challengeName}` : ""}
                    {item.dateLogged ? ` · ${item.dateLogged}` : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 gap-1">
                  <HandHeart className="size-3" aria-hidden="true" />
                  {item.vouchCount}/3 vouches
                </Badge>
              </div>

              {item.notes && (
                <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {item.notes}
                </p>
              )}

              {item.proofUrl && (
                <img
                  src={item.proofUrl || "/placeholder.svg"}
                  alt={`Proof submitted by ${item.employeeName}`}
                  className="max-h-48 w-full rounded-md border object-cover"
                />
              )}

              <Button
                size="sm"
                variant={item.alreadyVouched ? "secondary" : "default"}
                disabled={item.alreadyVouched || (isPending && pendingId === item.id)}
                onClick={() => handleVouch(item.id)}
                className="gap-2 self-start"
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {item.alreadyVouched
                  ? "Already vouched"
                  : isPending && pendingId === item.id
                    ? "Vouching..."
                    : "Vouch for this activity"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
