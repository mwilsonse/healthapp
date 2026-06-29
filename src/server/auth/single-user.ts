import type { PrismaClient, User } from "@prisma/client";

import { prisma } from "@/server/db";
import { failure, success, type ServiceResult } from "@/server/services/service-result";

const FALLBACK_DEFAULT_USER_ID = "default-user";

export function resolveDefaultUserId() {
  const configured = process.env.DEFAULT_USER_ID;

  if (!configured || configured.startsWith("replace-with")) {
    return FALLBACK_DEFAULT_USER_ID;
  }

  return configured;
}

export async function getSingleUser(
  db: PrismaClient = prisma
): Promise<ServiceResult<User>> {
  const configuredUserId = resolveDefaultUserId();

  const configuredUser = await db.user.findUnique({
    where: { id: configuredUserId }
  });

  if (configuredUser) {
    return success(configuredUser);
  }

  const firstUser = await db.user.findFirst({
    orderBy: { createdAt: "asc" }
  });

  if (!firstUser) {
    return failure(
      "NOT_FOUND",
      "No user exists. Run the seed script before using services."
    );
  }

  return success(firstUser);
}
