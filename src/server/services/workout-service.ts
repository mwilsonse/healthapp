import type { PlannedWorkout, PrismaClient } from "@prisma/client";

import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import type { PlannedWorkoutWithDetails } from "@/server/services/generation-service";
import { success, type ServiceResult } from "@/server/services/service-result";

export const workoutService = {
  async getTodayWorkout(
    now: Date = new Date(),
    db: PrismaClient = prisma
  ): Promise<ServiceResult<PlannedWorkout | null>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const workout = await db.plannedWorkout.findFirst({
      where: {
        userId: userResult.data.id,
        scheduledFor: {
          gte: start,
          lte: end
        }
      },
      orderBy: { scheduledFor: "asc" }
    });

    return success(workout);
  },

  async getTodayWorkoutWithDetails(
    now: Date = new Date(),
    db: PrismaClient = prisma
  ): Promise<ServiceResult<PlannedWorkoutWithDetails | null>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const workout = await db.plannedWorkout.findFirst({
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: {
              orderBy: { orderIndex: "asc" }
            }
          },
          orderBy: { orderIndex: "asc" }
        },
        rationale: true,
        trainingPlan: true
      },
      where: {
        userId: userResult.data.id,
        scheduledFor: {
          gte: start,
          lte: end
        },
        status: "PLANNED"
      },
      orderBy: { scheduledFor: "asc" }
    });

    return success(workout);
  }
};
