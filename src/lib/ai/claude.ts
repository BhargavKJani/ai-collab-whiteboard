import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-5-5";

/** Live mode only when a real-looking key is configured; otherwise the app runs in demo mode. */
export function isLive() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return !!key && key !== "your-key-here" && process.env.AI_MODE !== "mock";
}

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 90_000, maxRetries: 1 });
  return client;
}

type Content = Anthropic.Beta.BetaContentBlockParam[];

/**
 * One structured-output call to Claude. Returns the parsed JSON object.
 * Server-side fallbacks are enabled so a safety decline is retried on a fallback model.
 */
export async function askClaudeJson<T>(opts: {
  system: string;
  content: Content;
  schema: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
  maxTokens?: number;
}): Promise<T> {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: opts.system,
    output_config: {
      effort: opts.effort ?? "medium",
      format: { type: "json_schema", schema: opts.schema },
    },
    messages: [{ role: "user", content: opts.content }],
  });
  if (response.stop_reason === "refusal") throw new Error("Claude declined this request");
  if (response.stop_reason === "max_tokens") throw new Error("Claude response was truncated");
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return JSON.parse(text) as T;
}

/** Map SDK errors to a short message safe to show users. */
export function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "Invalid ANTHROPIC_API_KEY";
  if (err instanceof Anthropic.RateLimitError) return "Rate limited by the Claude API — try again shortly";
  if (err instanceof Anthropic.BadRequestError) return "Claude rejected the request";
  if (err instanceof Anthropic.APIError) return `Claude API error ${err.status ?? ""}`.trim();
  if (err instanceof Error) return err.message;
  return "Unknown AI error";
}
