-- Add dual password columns to Meeting table
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "hostPassword" TEXT;
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "participantPassword" TEXT;
