import { getEnv } from "@/server/env";
import { fakeAiProvider } from "@/server/ai/fake-provider";
import { openAiProvider } from "@/server/ai/openai-provider";
import type { AiProvider } from "@/server/ai/provider";

export function getConfiguredAiProvider(): AiProvider {
  const env = getEnv();

  if (env.AI_PROVIDER === "openai") {
    return openAiProvider;
  }

  return fakeAiProvider;
}
