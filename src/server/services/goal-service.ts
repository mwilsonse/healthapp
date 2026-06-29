import type { Goal, Prisma, PrismaClient } from "@prisma/client";

import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import {
  failure,
  success,
  validationFailure,
  type ServiceResult
} from "@/server/services/service-result";
import {
  createGoalInputSchema,
  type CreateGoalInput
} from "@/server/services/schemas";

export const goalService = {
  async listGoals(db: PrismaClient = prisma): Promise<ServiceResult<Goal[]>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const goals = await db.goal.findMany({
      where: { userId: userResult.data.id },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }]
    });

    return success(goals);
  },

  async createGoal(
    input: CreateGoalInput,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<Goal>> {
    const parsed = createGoalInputSchema.safeParse(input);

    if (!parsed.success) {
      return validationFailure(parsed.error.flatten());
    }

    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return failure(userResult.error.code, userResult.error.message);
    }

    const goal = await db.goal.create({
      data: {
        ...parsed.data,
        supportingMetrics: parsed.data.supportingMetrics as
          | Prisma.InputJsonValue
          | undefined,
        userId: userResult.data.id
      }
    });

    return success(goal);
  }
};
