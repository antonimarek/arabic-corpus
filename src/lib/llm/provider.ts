/**
 * Optional LLM layer. Corpus DB is the source of truth.
 * MVP: none. Ollama / cloud providers come later without rewriting the app.
 */

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type LlmCompletion = {
  content: string;
  toolCalls?: LlmToolCall[];
};

export interface LlmProvider {
  readonly id: string;
  complete(messages: LlmMessage[]): Promise<LlmCompletion>;
}

export class NoneLlmProvider implements LlmProvider {
  readonly id = "none";

  async complete(_messages: LlmMessage[]): Promise<LlmCompletion> {
    throw new Error(
      "LLMProvider is none. Local AI is deferred. Use corpus search instead.",
    );
  }
}

export function getLlmProvider(): LlmProvider {
  return new NoneLlmProvider();
}
