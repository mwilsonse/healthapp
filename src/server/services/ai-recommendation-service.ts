import { z } from "zod";

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
  type: string;
}

export const aiRecommendationService = {
  validateStructuredOutput<TOutput>(
    output: unknown,
    schema: z.ZodType<TOutput>
  ): ServiceResult<TOutput> {
    const parsed = schema.safeParse(output);

    if (!parsed.success) {
      return failure("VALIDATION", "AI output failed schema validation.", parsed.error.flatten());
    }

    return success(parsed.data);
  },

  async generateStructured<TInput, TOutput>(
    _request: StructuredAiRequest<TInput, TOutput>
  ): Promise<ServiceResult<TOutput>> {
    return failure(
      "NOT_IMPLEMENTED",
      "AI provider integration starts in Phase 8."
    );
  }
};
