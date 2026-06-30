import type { Prisma } from "@prisma/client";
import type { z } from "zod";

export interface AiProviderRequest<TInput, TOutput = unknown> {
  input: TInput;
  schema: z.ZodType<TOutput>;
  schemaName: string;
  schemaVersion: string;
  systemPrompt?: string;
  userPrompt?: string;
}

export interface AiProviderResponse {
  model: string;
  output: unknown;
  provider: string;
  tokenUsage?: Prisma.InputJsonValue;
}

export interface AiProvider {
  generateJson<TInput, TOutput>(
    request: AiProviderRequest<TInput, TOutput>
  ): Promise<AiProviderResponse>;
}
