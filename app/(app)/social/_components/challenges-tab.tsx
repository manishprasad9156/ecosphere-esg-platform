"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CreateChallengeDialog } from "./create-challenge-dialog"
import { CalendarDays, Repeat, Search } from "lucide-react"

export type WellbeingChallenge = {
  id: string
  name: string
  description: string | null
  targetFrequency: number
  cycleType: string
  status: boolean
  createdAt: Date
}

export function ChallengesTab({
  initialChallenges,
  isAdmin,
}: {
  initialChallenges: WellbeingChallenge[]
  isAdmin: boolean
}) {
  const [search, setSearch] = useState("")
  const [cycleFilter, setCycleFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("createdAt")

  const filtered = useMemo(() => {
    let list = [...initialChallenges]
    if (cycleFilter !== "all")
      list = list.filter((c) => c.cycleType === cycleFilter)
    if (search.trim()) {
      const term = search.trim().toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          (c.description ?? "").toLowerCase().includes(term),
      )
    }
    if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name))
    else if (sortBy === "targetFrequency")
      list.sort((a, b) => b.targetFrequency - a.targetFrequency)
    else
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    return list
  }, [initialChallenges, search, cycleFilter, sortBy])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search challenges..."
              className="pl-8"
              aria-label="Search challenges"
            />
          </div>
          <Select value={cycleFilter} onValueChange={setCycleFilter}>
            <SelectTrigger className="w-full sm:w-36" aria-label="Filter by cycle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cycles</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-40" aria-label="Sort challenges">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Newest first</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="targetFrequency">Frequency</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isAdmin && <CreateChallengeDialog />}
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No challenges match your filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((challenge) => (
            <Card key={challenge.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug text-pretty">
                    {challenge.name}
                  </CardTitle>
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {challenge.cycleType}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {challenge.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Repeat className="size-3.5" aria-hidden="true" />
                    Target: {challenge.targetFrequency}x per{" "}
                    {challenge.cycleType === "weekly" ? "week" : "month"}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    {new Date(challenge.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
