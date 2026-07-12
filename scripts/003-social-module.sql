-- Social Module: Wellbeing Challenges, Activity Tracking,
-- Peer Verification, Streak Rewards

CREATE TABLE IF NOT EXISTS "wellbeing_challenges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "targetFrequency" integer NOT NULL,
  "cycleType" text NOT NULL DEFAULT 'weekly',
  "status" boolean NOT NULL DEFAULT true,
  "createdBy" text REFERENCES "user"("id") ON DELETE SET NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "wellbeing_challenges_cycle_check" CHECK ("cycleType" IN ('weekly', 'monthly')),
  CONSTRAINT "wellbeing_challenges_freq_check" CHECK ("targetFrequency" > 0)
);

CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "challengeId" uuid NOT NULL REFERENCES "wellbeing_challenges"("id") ON DELETE CASCADE,
  "activityType" text NOT NULL,
  "notes" text,
  "proofUrl" text,
  "dateLogged" date NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "activity_logs_employee_idx" ON "activity_logs" ("employeeId");
CREATE INDEX IF NOT EXISTS "activity_logs_challenge_idx" ON "activity_logs" ("challengeId");
CREATE INDEX IF NOT EXISTS "activity_logs_date_idx" ON "activity_logs" ("dateLogged");

CREATE TABLE IF NOT EXISTS "employee_participations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "activityId" uuid REFERENCES "activity_logs"("id") ON DELETE CASCADE,
  "proofUrl" text,
  "approvalStatus" text NOT NULL DEFAULT 'pending',
  "pointsEarned" integer NOT NULL DEFAULT 0,
  "vouchCount" integer NOT NULL DEFAULT 0,
  "source" text NOT NULL DEFAULT 'activity',
  "weekStart" date,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "participations_status_check" CHECK ("approvalStatus" IN ('pending', 'approved', 'rejected')),
  CONSTRAINT "participations_source_check" CHECK ("source" IN ('activity', 'weekly_streak')),
  CONSTRAINT "participations_weekly_streak_unique" UNIQUE ("employeeId", "source", "weekStart")
);

CREATE INDEX IF NOT EXISTS "participations_employee_idx" ON "employee_participations" ("employeeId");
CREATE INDEX IF NOT EXISTS "participations_status_idx" ON "employee_participations" ("approvalStatus");

CREATE TABLE IF NOT EXISTS "peer_verifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "participationId" uuid NOT NULL REFERENCES "employee_participations"("id") ON DELETE CASCADE,
  "voucherEmployeeId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "peer_verifications_unique_vouch" UNIQUE ("participationId", "voucherEmployeeId")
);

-- Seed a few starter wellbeing challenges (idempotent)
INSERT INTO "wellbeing_challenges" ("name", "description", "targetFrequency", "cycleType")
SELECT * FROM (VALUES
  ('Daily Steps Challenge', 'Walk at least 8,000 steps a day. Log each day you hit the target.', 5, 'weekly'),
  ('Cycle to Work', 'Commute by bicycle instead of car. Log each cycling commute.', 3, 'weekly'),
  ('Mindful Minutes', 'Practice 10 minutes of meditation or mindfulness.', 4, 'weekly'),
  ('Volunteer Hours', 'Spend time volunteering for a community or environmental cause.', 2, 'monthly')
) AS v("name", "description", "targetFrequency", "cycleType")
WHERE NOT EXISTS (SELECT 1 FROM "wellbeing_challenges");
