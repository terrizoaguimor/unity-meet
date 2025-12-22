-- CreateEnum
CREATE TYPE "AISummaryStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EMAIL_SENT');

-- CreateTable
CREATE TABLE "MeetingSummary" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "transcript" TEXT,
    "transcriptJson" JSONB,
    "title" TEXT,
    "summary" TEXT,
    "keyPoints" JSONB,
    "language" TEXT NOT NULL DEFAULT 'es',
    "topics" JSONB,
    "sentiment" TEXT,
    "participation" JSONB,
    "suggestions" JSONB,
    "actionItems" JSONB,
    "followUpEmail" JSONB,
    "status" "AISummaryStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "generatedAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingSummary_meetingId_key" ON "MeetingSummary"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingSummary_meetingId_idx" ON "MeetingSummary"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingSummary_status_idx" ON "MeetingSummary"("status");

-- AddForeignKey
ALTER TABLE "MeetingSummary" ADD CONSTRAINT "MeetingSummary_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
