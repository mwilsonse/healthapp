import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

import { getEnv } from "@/server/env";
import type {
  AiProvider,
  AiProviderRequest,
  AiProviderResponse
} from "@/server/ai/provider";

function schemaFormatName(schemaName: string, schemaVersion: string) {
  return `${schemaName}_v${schemaVersion}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export const openAiProvider: AiProvider = {
  async generateJson<TInput, TOutput>(
    request: AiProviderRequest<TInput, TOutput>
  ): Promise<AiProviderResponse> {
    const env = getEnv();

    if (!env.AI_API_KEY) {
      throw new Error("AI_API_KEY is required when AI_PROVIDER is openai.");
    }

    const client = new OpenAI({ apiKey: env.AI_API_KEY });
    const completion = await client.chat.completions.parse({
      messages: [
        {
          content:
            request.systemPrompt ??
            "You are the PHIP coaching engine. Return only valid JSON matching the requested schema.",
          role: "system"
        },
        {
          content: JSON.stringify({
            input: request.input,
            outputSchemaName: request.schemaName,
            outputSchemaVersion: request.schemaVersion,
            task: request.userPrompt
          }),
          role: "user"
        }
      ],
      model: env.AI_MODEL,
      response_format: zodResponseFormat(
        request.schema,
        schemaFormatName(request.schemaName, request.schemaVersion)
      ),
      temperature: 0.2
    });
    const parsed = completion.choices[0]?.message.parsed;

    if (!parsed) {
      throw new Error("OpenAI response did not include parsed content.");
    }

    return {
      model: completion.model ?? env.AI_MODEL,
      output: parsed,
      provider: "openai",
      tokenUsage: completion.usage as AiProviderResponse["tokenUsage"]
    };
  }
};
