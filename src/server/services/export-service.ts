import type { PrismaClient } from "@prisma/client";

import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import { success, type ServiceResult } from "@/server/services/service-result";

export interface UserExportSummary {
  userId: string;
  generatedAt: string;
  counts: {
    equipment: number;
    exercises: number;
    goals: number;
    measurements: number;
    plannedWorkouts: number;
    completedWorkouts: number;
  };
}

export const exportService = {
  async getExportSummary(
    db: PrismaClient = prisma
  ): Promise<ServiceResult<UserExportSummary>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const userId = userResult.data.id;
    const [
      equipment,
      exercises,
      goals,
      measurements,
      plannedWorkouts,
      completedWorkouts
    ] = await Promise.all([
      db.equipment.count({ where: { userId } }),
      db.exercise.count(),
      db.goal.count({ where: { userId } }),
      db.userMeasurement.count({ where: { userId } }),
      db.plannedWorkout.count({ where: { userId } }),
      db.completedWorkout.count({ where: { userId } })
    ]);

    return success({
      userId,
      generatedAt: new Date().toISOString(),
      counts: {
        completedWorkouts,
        equipment,
        exercises,
        goals,
        measurements,
        plannedWorkouts
      }
    });
  }
};
