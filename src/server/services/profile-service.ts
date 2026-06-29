import type { Prisma, PrismaClient, UserProfile } from "@prisma/client";

import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import {
  failure,
  success,
  validationFailure,
  type ServiceResult
} from "@/server/services/service-result";
import {
  upsertProfileInputSchema,
  type UpsertProfileInput
} from "@/server/services/schemas";

export const profileService = {
  async getProfile(db: PrismaClient = prisma): Promise<ServiceResult<UserProfile | null>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const profile = await db.userProfile.findUnique({
      where: { userId: userResult.data.id }
    });

    return success(profile);
  },

  async upsertProfile(
    input: UpsertProfileInput,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<UserProfile>> {
    const parsed = upsertProfileInputSchema.safeParse(input);

    if (!parsed.success) {
      return validationFailure(parsed.error.flatten());
    }

    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return failure(userResult.error.code, userResult.error.message);
    }

    const data = {
      ...parsed.data,
      preferredTrainingTimes: parsed.data.preferredTrainingTimes as
        | Prisma.InputJsonValue
        | undefined
    };

    const profile = await db.userProfile.upsert({
      where: { userId: userResult.data.id },
      update: data,
      create: {
        ...data,
        userId: userResult.data.id
      }
    });

    return success(profile);
  }
};
