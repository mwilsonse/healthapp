import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  openAiClient: vi.fn(),
  parse: vi.fn(),
  zodResponseFormat: vi.fn(() => ({ type: "json_schema" }))
}));

vi.mock("openai", () => ({
  default: mocks.openAiClient
}));

vi.mock("openai/helpers/zod", () => ({
  zodResponseFormat: mocks.zodResponseFormat
}));

describe("openAiProvider", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.AI_API_KEY = "test-api-key";
    process.env.AI_MODEL = "gpt-4.1-mini";
    process.env.APP_SECRET = "test-secret";
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

    mocks.openAiClient.mockImplementation(() => ({
      chat: {
        completions: {
          parse: mocks.parse
        }
      }
    }));
  });

  it("requests a parsed structured output with the Zod response format", async () => {
    const parsedOutput = { summary: "Done" };
    const schema = z.object({ summary: z.string() }).strict();
    mocks.parse.mockResolvedValue({
      choices: [{ message: { parsed: parsedOutput } }],
      model: "gpt-4.1-mini-2025-04-14",
      usage: { total_tokens: 42 }
    });

    const { openAiProvider } = await import("@/server/ai/openai-provider");
    const response = await openAiProvider.generateJson({
      input: { goal: "test" },
      schema,
      schemaName: "TestOutput",
      schemaVersion: "1",
      userPrompt: "Return a summary."
    });

    expect(mocks.openAiClient).toHaveBeenCalledWith({
      apiKey: "test-api-key"
    });
    expect(mocks.zodResponseFormat).toHaveBeenCalledWith(
      schema,
      "TestOutput_v1"
    );
    expect(mocks.parse).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4.1-mini",
        response_format: { type: "json_schema" },
        temperature: 0.2
      })
    );
    expect(response).toEqual({
      model: "gpt-4.1-mini-2025-04-14",
      output: parsedOutput,
      provider: "openai",
      tokenUsage: { total_tokens: 42 }
    });
  });

  it("fails cleanly when OpenAI does not return parsed content", async () => {
    const schema = z.object({ summary: z.string() }).strict();
    mocks.parse.mockResolvedValue({
      choices: [{ message: { parsed: null } }],
      model: "gpt-4.1-mini-2025-04-14",
      usage: { total_tokens: 42 }
    });

    const { openAiProvider } = await import("@/server/ai/openai-provider");

    await expect(
      openAiProvider.generateJson({
        input: { goal: "test" },
        schema,
        schemaName: "TestOutput",
        schemaVersion: "1"
      })
    ).rejects.toThrow("OpenAI response did not include parsed content.");
  });
});
