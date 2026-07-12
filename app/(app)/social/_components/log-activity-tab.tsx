"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { logActivity } from "@/app/actions/social/activity"
import type { WellbeingChallenge } from "./challenges-tab"
import { ImageIcon, Paperclip } from "lucide-react"

type ActivityLogRow = {
  id: string
  activityType: string
  notes: string | null
  proofUrl: string | null
  dateLogged: string
  createdAt: Date
  challengeName: string
}

export function LogActivityTab({
  challenges,
  myLogs,
}: {
  challenges: WellbeingChallenge[]
  myLogs: ActivityLogRow[]
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [challengeId, setChallengeId] = useState<string>("")
  const [fileName, setFileName] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!challengeId) {
      toast.error("Please select a challenge")
      return
    }
    const formData = new FormData(e.currentTarget)
    formData.set("challengeId", challengeId)
    startTransition(async () => {
      const result = await logActivity(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Activity logged. It is now pending peer verification.")
      formRef.current?.reset()
      setFileName(null)
      router.refresh()
    })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log an Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Challenge</Label>
              <Select value={challengeId} onValueChange={setChallengeId}>
                <SelectTrigger aria-label="Select challenge">
                  <SelectValue placeholder="Select a challenge" />
                </SelectTrigger>
                <SelectContent>
                  {challenges.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="activity-type">Activity type</Label>
              <Input
                id="activity-type"
                name="activityType"
                required
                maxLength={200}
                placeholder="e.g. Morning walk, Cycled to office"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="activity-date">Date</Label>
              <Input
                id="activity-date"
                name="dateLogged"
                type="date"
                required
                defaultValue={today}
                max={today}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="activity-notes">Notes (optional)</Label>
              <Textarea
                id="activity-notes"
                name="notes"
                maxLength={2000}
                placeholder="Any details about your activity..."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="activity-proof">Proof photo (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="activity-proof"
                  name="proof"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="cursor-pointer"
                  onChange={(e) =>
                    setFileName(e.target.files?.[0]?.name ?? null)
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP, or GIF up to 5 MB.
                {fileName ? ` Selected: ${fileName}` : ""}
              </p>
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Logging..." : "Log activity"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {myLogs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No activities logged yet. Log your first one to get started.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {myLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-start justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {log.activityType}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.challengeName} · {log.dateLogged}
                    </p>
                    {log.notes && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {log.notes}
                      </p>
                    )}
                  </div>
                  {log.proofUrl ? (
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      <ImageIcon className="size-3" aria-hidden="true" />
                      Proof
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="shrink-0 gap-1 text-muted-foreground">
                      <Paperclip className="size-3" aria-hidden="true" />
                      No proof
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
