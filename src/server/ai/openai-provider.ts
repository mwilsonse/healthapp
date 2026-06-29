import { getEnv } from "@/server/env";
import type {
  AiProvider,
  AiProviderRequest,
  AiProviderResponse
} from "@/server/ai/provider";

interface OpenAiChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  model?: string;
  usage?: unknown;
}

function parseJsonContent(content: string) {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new Error("OpenAI response was not valid JSON.");
  }
}

export const openAiProvider: AiProvider = {
  async generateJson<TInput>(
    request: AiProviderRequest<TInput>
  ): Promise<AiProviderResponse> {
    const env = getEnv();

    if (!env.AI_API_KEY) {
      throw new Error("AI_API_KEY is required when AI_PROVIDER is openai.");
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      body: JSON.stringify({
        messages: [
          {
            content:
              request.systemPrompt ??
              "You are the PHIP coaching engine. Return only valid JSON.",
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
        response_format: { type: "json_object" },
        temperature: 0.2
      }),
      headers: {
        Authorization: `Bearer ${env.AI_API_KEY}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI request failed with ${response.status}: ${body}`);
    }

    const data = (await response.json()) as OpenAiChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("OpenAI response did not include message content.");
    }

    return {
      model: data.model ?? env.AI_MODEL,
      output: parseJsonContent(content),
      provider: "openai",
      tokenUsage: data.usage as AiProviderResponse["tokenUsage"]
    };
  }
};
