/**
 * Agent execution engine.
 * Receives an inbound message, resolves the agent config, calls the LLM,
 * persists the conversation, and returns a response with an avatar animation cue.
 */

import type {
  AgentConfig,
  AgentResponse,
  AvatarAnimationKind,
  ConversationMessage,
  IntegrationKind,
} from "./types.js";
import type { ConversationStore } from "./conversation-store.js";
import type { AnalyticsTracker } from "./analytics.js";

// -- Animation heuristic ------------------------------------------------------

/** Pick an avatar animation based on the response content. */
export function pickAnimation(text: string): AvatarAnimationKind {
  const lower = text.toLowerCase();
  if (lower.includes("congratulations") || lower.includes("great job") || lower.includes("!")) {
    return "celebrating";
  }
  if (lower.includes("let me think") || lower.includes("hmm") || lower.includes("considering")) {
    return "thinking";
  }
  if (lower.includes("hello") || lower.includes("hi ") || lower.includes("hey")) {
    return "waving";
  }
  return "talking";
}

// -- LLM caller abstraction ---------------------------------------------------

/**
 * Minimal interface for calling an LLM.
 * The default implementation calls the Anthropic Messages API,
 * but tests can inject a stub.
 */
export type LlmCaller = (opts: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}) => Promise<string>;

/**
 * Default LLM caller that uses the `fetch` global to call the Anthropic API.
 * Requires `ANTHROPIC_API_KEY` in the environment.
 */
export async function anthropicCaller(opts: {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<string> {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: opts.systemPrompt,
    messages: opts.messages,
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { content: Array<{ type: string; text: string }> };
  const firstText = json.content.find((c) => c.type === "text");
  return firstText?.text ?? "";
}

// -- Engine -------------------------------------------------------------------

export type AgentEngineOpts = {
  conversationStore: ConversationStore;
  analytics: AnalyticsTracker;
  llmCaller?: LlmCaller;
};

export class AgentEngine {
  private conversationStore: ConversationStore;
  private analytics: AnalyticsTracker;
  private llmCaller: LlmCaller;

  constructor(opts: AgentEngineOpts) {
    this.conversationStore = opts.conversationStore;
    this.analytics = opts.analytics;
    this.llmCaller = opts.llmCaller ?? anthropicCaller;
  }

  /**
   * Handle an inbound message for a given agent.
   * Returns the agent response with an animation cue.
   */
  async handleMessage(
    agent: AgentConfig,
    externalUserId: string,
    platform: IntegrationKind,
    userMessage: string,
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    // 1. Resolve conversation
    const conversation = this.conversationStore.findOrCreate(agent.id, externalUserId, platform);

    // 2. Append user message
    const userMsg: ConversationMessage = {
      role: "user",
      content: userMessage,
      timestamp: startTime,
    };
    conversation.messages.push(userMsg);

    // 3. Build message history (keep last 20 turns to stay within context limits)
    const recentMessages = conversation.messages.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 4. Call LLM
    const responseText = await this.llmCaller({
      systemPrompt: agent.systemPrompt,
      messages: recentMessages,
    });

    const endTime = Date.now();
    const responseTimeMs = endTime - startTime;

    // 5. Append assistant message
    const assistantMsg: ConversationMessage = {
      role: "assistant",
      content: responseText,
      timestamp: endTime,
    };
    conversation.messages.push(assistantMsg);
    conversation.updatedAt = new Date().toISOString();

    // 6. Track analytics
    this.analytics.recordMessage(agent.id, platform, responseTimeMs);

    // 7. Pick animation
    const animation = pickAnimation(responseText);

    return {
      message: responseText,
      animation,
      timestamp: endTime,
      responseTimeMs,
    };
  }
}
