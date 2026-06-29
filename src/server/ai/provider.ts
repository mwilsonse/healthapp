import type { Prisma } from "@prisma/client";

export interface AiProviderRequest<TInput> {
  input: TInput;
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
  generateJson<TInput>(
    request: AiProviderRequest<TInput>
  ): Promise<AiProviderResponse>;
}
