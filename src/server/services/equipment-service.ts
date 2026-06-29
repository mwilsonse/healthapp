import type { AvailableLoad, Equipment, PrismaClient } from "@prisma/client";

import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import {
  failure,
  success,
  validationFailure,
  type ServiceResult
} from "@/server/services/service-result";
import {
  createAvailableLoadInputSchema,
  createEquipmentInputSchema,
  type CreateAvailableLoadInput,
  type CreateEquipmentInput
} from "@/server/services/schemas";

export const equipmentService = {
  async listEquipment(
    db: PrismaClient = prisma
  ): Promise<ServiceResult<(Equipment & { availableLoads: AvailableLoad[] })[]>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const equipment = await db.equipment.findMany({
      where: { userId: userResult.data.id },
      include: { availableLoads: true },
      orderBy: [{ type: "asc" }, { name: "asc" }]
    });

    return success(equipment);
  },

  async createEquipment(
    input: CreateEquipmentInput,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<Equipment>> {
    const parsed = createEquipmentInputSchema.safeParse(input);

    if (!parsed.success) {
      return validationFailure(parsed.error.flatten());
    }

    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return failure(userResult.error.code, userResult.error.message);
    }

    const equipment = await db.equipment.create({
      data: {
        ...parsed.data,
        userId: userResult.data.id
      }
    });

    return success(equipment);
  },

  async createAvailableLoad(
    input: CreateAvailableLoadInput,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<AvailableLoad>> {
    const parsed = createAvailableLoadInputSchema.safeParse(input);

    if (!parsed.success) {
      return validationFailure(parsed.error.flatten());
    }

    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return failure(userResult.error.code, userResult.error.message);
    }

    const availableLoad = await db.availableLoad.create({
      data: {
        ...parsed.data,
        userId: userResult.data.id
      }
    });

    return success(availableLoad);
  }
};
