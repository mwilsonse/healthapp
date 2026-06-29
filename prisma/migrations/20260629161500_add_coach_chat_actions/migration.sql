CREATE TABLE "coach_chat_actions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "aiInteractionId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "input" JSONB,
    "status" "CoachActionStatus" NOT NULL DEFAULT 'suggested',
    "statusMessage" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_chat_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "coach_chat_actions_userId_status_createdAt_idx" ON "coach_chat_actions"("userId", "status", "createdAt");

ALTER TABLE "coach_chat_actions" ADD CONSTRAINT "coach_chat_actions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coach_chat_actions" ADD CONSTRAINT "coach_chat_actions_aiInteractionId_fkey" FOREIGN KEY ("aiInteractionId") REFERENCES "ai_interactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
