-- CreateTable
CREATE TABLE "plan_edit_commitments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainingPlanId" TEXT NOT NULL,
    "plannedWorkoutId" TEXT,
    "completedWorkoutId" TEXT,
    "title" TEXT NOT NULL,
    "changeSummary" TEXT NOT NULL,
    "committed" BOOLEAN NOT NULL DEFAULT false,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_edit_commitments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_edit_commitments_completedWorkoutId_key" ON "plan_edit_commitments"("completedWorkoutId");

-- CreateIndex
CREATE INDEX "plan_edit_commitments_userId_trainingPlanId_committed_idx" ON "plan_edit_commitments"("userId", "trainingPlanId", "committed");

-- AddForeignKey
ALTER TABLE "plan_edit_commitments" ADD CONSTRAINT "plan_edit_commitments_completedWorkoutId_fkey" FOREIGN KEY ("completedWorkoutId") REFERENCES "completed_workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_edit_commitments" ADD CONSTRAINT "plan_edit_commitments_plannedWorkoutId_fkey" FOREIGN KEY ("plannedWorkoutId") REFERENCES "planned_workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_edit_commitments" ADD CONSTRAINT "plan_edit_commitments_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "training_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_edit_commitments" ADD CONSTRAINT "plan_edit_commitments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
