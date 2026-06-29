import type { PrismaClient, TrainingPlan } from "@prisma/client";

import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import type { TrainingPlanWithWorkouts } from "@/server/services/generation-service";
import { success, type ServiceResult } from "@/server/services/service-result";

export const planningService = {
  async getActivePlan(
    db: PrismaClient = prisma
  ): Promise<ServiceResult<TrainingPlan | null>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const plan = await db.trainingPlan.findFirst({
      where: {
        userId: userResult.data.id,
        status: "ACTIVE"
      },
      orderBy: { startDate: "desc" }
    });

    return success(plan);
  },

  async getActivePlanWithWorkouts(
    db: PrismaClient = prisma
  ): Promise<ServiceResult<TrainingPlanWithWorkouts | null>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const plan = await db.trainingPlan.findFirst({
      include: {
        plannedWorkouts: {
          orderBy: { scheduledFor: "asc" }
        },
        rationale: true
      },
      where: {
        userId: userResult.data.id,
        status: "ACTIVE"
      },
      orderBy: { startDate: "desc" }
    });

    return success(plan);
  }
};
