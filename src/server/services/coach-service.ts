import type { CoachNote, PrismaClient } from "@prisma/client";

import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import { success, type ServiceResult } from "@/server/services/service-result";

export const coachService = {
  async listActiveNotes(
    now: Date = new Date(),
    db: PrismaClient = prisma
  ): Promise<ServiceResult<CoachNote[]>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const notes = await db.coachNote.findMany({
      where: {
        userId: userResult.data.id,
        OR: [{ validUntil: null }, { validUntil: { gte: now } }]
      },
      orderBy: { createdAt: "desc" }
    });

    return success(notes);
  }
};
