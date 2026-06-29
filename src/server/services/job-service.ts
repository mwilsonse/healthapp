import type { Job, Prisma, PrismaClient } from "@prisma/client";

import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import {
  failure,
  success,
  validationFailure,
  type ServiceResult
} from "@/server/services/service-result";
import {
  enqueueJobInputSchema,
  type EnqueueJobInput
} from "@/server/services/schemas";

export const jobService = {
  async enqueueJob(
    input: EnqueueJobInput,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<Job>> {
    const parsed = enqueueJobInputSchema.safeParse(input);

    if (!parsed.success) {
      return validationFailure(parsed.error.flatten());
    }

    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return failure(userResult.error.code, userResult.error.message);
    }

    const job = await db.job.create({
      data: {
        ...parsed.data,
        inputSnapshot: parsed.data.inputSnapshot as
          | Prisma.InputJsonValue
          | undefined,
        userId: userResult.data.id
      }
    });

    return success(job);
  },

  async listRecentJobs(db: PrismaClient = prisma): Promise<ServiceResult<Job[]>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const jobs = await db.job.findMany({
      where: { userId: userResult.data.id },
      orderBy: { createdAt: "desc" },
      take: 25
    });

    return success(jobs);
  }
};
