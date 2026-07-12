"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createWellbeingChallenge } from "@/app/actions/social/challenges"
import { Plus } from "lucide-react"

export function CreateChallengeDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [cycleType, setCycleType] = useState<"weekly" | "monthly">("weekly")

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createWellbeingChallenge({
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? "") || undefined,
        targetFrequency: Number(form.get("targetFrequency")),
        cycleType,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Challenge created")
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="size-4" aria-hidden="true" />
          New Challenge
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Wellbeing Challenge</DialogTitle>
          <DialogDescription>
            Define a challenge employees can log activities against.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="challenge-name">Name</Label>
            <Input
              id="challenge-name"
              name="name"
              required
              maxLength={200}
              placeholder="e.g. Daily Steps Challenge"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="challenge-description">Description</Label>
            <Textarea
              id="challenge-description"
              name="description"
              maxLength={2000}
              placeholder="What should employees do?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="challenge-frequency">Target frequency</Label>
              <Input
                id="challenge-frequency"
                name="targetFrequency"
                type="number"
                min={1}
                required
                defaultValue={3}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Cycle</Label>
              <Select
                value={cycleType}
                onValueChange={(v) => setCycleType(v as "weekly" | "monthly")}
              >
                <SelectTrigger aria-label="Cycle type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create challenge"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
