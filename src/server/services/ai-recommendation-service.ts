import {
  AiInteractionType,
  type AiInteraction,
  type Prisma,
  type PrismaClient
} from "@prisma/client";
import { z } from "zod";

import { getSingleUser } from "@/server/auth/single-user";
import { getConfiguredAiProvider } from "@/server/ai/providers";
import type { AiProvider } from "@/server/ai/provider";
import { prisma } from "@/server/db";
import { logger } from "@/server/logging";
import {
  failure,
  success,
  type ServiceResult
} from "@/server/services/service-result";

export interface StructuredAiRequest<TInput, TOutput> {
  input: TInput;
  schema: z.ZodType<TOutput>;
  schemaName: string;
  schemaVersion: string;
  systemPrompt?: string;
  type: AiInteractionType;
  userPrompt?: string;
}

export const aiRecommendationService = {
  validateStructuredOutput<TOutput>(
    output: unknown,
    schema: z.ZodType<TOutput>
  ): ServiceResult<TOutput> {
    const parsed = schema.safeParse(output);

    if (!parsed.success) {
      return failure(
        "VALIDATION",
        "AI output failed schema validation.",
        parsed.error.flatten()
      );
    }

    return success(parsed.data);
  },

  async generateStructured<TInput, TOutput>(
    request: StructuredAiRequest<TInput, TOutput>,
    options: {
      db?: PrismaClient;
      provider?: AiProvider;
    } = {}
  ): Promise<ServiceResult<{ interaction: AiInteraction; output: TOutput }>> {
    const db = options.db ?? prisma;
    const provider = options.provider ?? getConfiguredAiProvider();
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    try {
      const providerResponse = await provider.generateJson(request);
      const validated = this.validateStructuredOutput(
        providerResponse.output,
        request.schema
      );

      if (!validated.ok) {
        const interaction = await db.aiInteraction.create({
          data: {
            error: validated.error.message,
            inputSnapshot: request.input as Prisma.InputJsonValue,
            model: providerResponse.model,
            outputSchemaVersion: request.schemaVersion,
            provider: providerResponse.provider,
            tokenUsage: providerResponse.tokenUsage,
            type: request.type,
            userId: userResult.data.id
          }
        });

        logger.warn("AI output failed validation", {
          details: validated.error.details,
          interactionId: interaction.id,
          schemaName: request.schemaName,
          schemaVersion: request.schemaVersion
        });

        return failure(
          validated.error.code,
          validated.error.message,
          validated.error.details
        );
      }

      const interaction = await db.aiInteraction.create({
        data: {
          inputSnapshot: request.input as Prisma.InputJsonValue,
          model: providerResponse.model,
          outputSchemaVersion: request.schemaVersion,
          provider: providerResponse.provider,
          tokenUsage: providerResponse.tokenUsage,
          type: request.type,
          userId: userResult.data.id,
          validatedOutput: validated.data as Prisma.InputJsonValue
        }
      });

      logger.info("AI output validated", {
        interactionId: interaction.id,
        provider: providerResponse.provider,
        schemaName: request.schemaName,
        schemaVersion: request.schemaVersion,
        type: request.type
      });

      return success({ interaction, output: validated.data });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const interaction = await db.aiInteraction.create({
        data: {
          error: message,
          inputSnapshot: request.input as Prisma.InputJsonValue,
          model: "unknown",
          outputSchemaVersion: request.schemaVersion,
          provider: "unknown",
          type: request.type,
          userId: userResult.data.id
        }
      });

      logger.error("AI provider request failed", {
        error: message,
        interactionId: interaction.id,
        schemaName: request.schemaName,
        schemaVersion: request.schemaVersion
      });

      return failure("INTERNAL", "AI provider request failed.", {
        interactionId: interaction.id,
        message
      });
    }
  }
};
