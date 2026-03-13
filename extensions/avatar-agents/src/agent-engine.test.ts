import { describe, expect, it } from "vitest";

import { AgentEngine, pickAnimation } from "./agent-engine.js";
import { ConversationStore } from "./conversation-store.js";
import { AnalyticsTracker } from "./analytics.js";
import type { AgentConfig } from "./types.js";

function makeAgent(overrides?: Partial<AgentConfig>): AgentConfig {
  return {
    id: "agent-test",
    userId: "user-1",
    name: "Test Agent",
    description: "A test agent",
    systemPrompt: "You are a helpful assistant.",
    personality: "helpful",
    avatarConfig: { modelId: "avatar-friendly-robot" },
    integrations: [],
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("pickAnimation", () => {
  it("returns celebrating for congratulatory text", () => {
    expect(pickAnimation("Congratulations on your achievement!")).toBe("celebrating");
  });

  it("returns thinking for contemplative text", () => {
    expect(pickAnimation("Let me think about that...")).toBe("thinking");
  });

  it("returns waving for greetings", () => {
    expect(pickAnimation("Hello there, how can I help?")).toBe("waving");
  });

  it("returns talking as default", () => {
    expect(pickAnimation("The answer to your question is 42.")).toBe("talking");
  });

  it("returns celebrating for exclamation marks", () => {
    expect(pickAnimation("That is amazing!")).toBe("celebrating");
  });
});

describe("AgentEngine", () => {
  it("handles a message and returns a response", async () => {
    const conversationStore = new ConversationStore();
    const analytics = new AnalyticsTracker();
    const stubCaller = async () => "Hello, how can I help you today?";

    const engine = new AgentEngine({
      conversationStore,
      analytics,
      llmCaller: stubCaller,
    });

    const agent = makeAgent();
    const response = await engine.handleMessage(agent, "user-ext-1", "discord", "Hi there");

    expect(response.message).toBe("Hello, how can I help you today?");
    expect(response.animation).toBe("waving");
    expect(response.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(response.timestamp).toBeGreaterThan(0);
  });

  it("persists conversation messages", async () => {
    const conversationStore = new ConversationStore();
    const analytics = new AnalyticsTracker();
    let callCount = 0;
    const stubCaller = async () => {
      callCount++;
      return `Response ${callCount}`;
    };

    const engine = new AgentEngine({
      conversationStore,
      analytics,
      llmCaller: stubCaller,
    });

    const agent = makeAgent();
    await engine.handleMessage(agent, "user-1", "web-widget", "First message");
    await engine.handleMessage(agent, "user-1", "web-widget", "Second message");

    const conversations = conversationStore.listByAgent("agent-test");
    expect(conversations.length).toBe(1);
    // 2 user messages + 2 assistant messages = 4 total
    expect(conversations[0]!.messages.length).toBe(4);
    expect(conversations[0]!.messages[0]!.role).toBe("user");
    expect(conversations[0]!.messages[1]!.role).toBe("assistant");
  });

  it("tracks analytics for each message", async () => {
    const conversationStore = new ConversationStore();
    const analytics = new AnalyticsTracker();
    const stubCaller = async () => "OK";

    const engine = new AgentEngine({
      conversationStore,
      analytics,
      llmCaller: stubCaller,
    });

    const agent = makeAgent();
    await engine.handleMessage(agent, "user-1", "discord", "Test");
    await engine.handleMessage(agent, "user-2", "slack", "Test");

    const stats = analytics.getAnalytics("agent-test");
    expect(stats.totalMessages).toBe(2);
    expect(stats.messagesThisMonth).toBe(2);
  });

  it("passes system prompt and conversation history to LLM", async () => {
    const conversationStore = new ConversationStore();
    const analytics = new AnalyticsTracker();
    let capturedOpts: { systemPrompt: string; messages: Array<{ role: string; content: string }> } | undefined;

    const stubCaller = async (opts: { systemPrompt: string; messages: Array<{ role: string; content: string }> }) => {
      capturedOpts = opts;
      return "Response";
    };

    const engine = new AgentEngine({
      conversationStore,
      analytics,
      llmCaller: stubCaller,
    });

    const agent = makeAgent({ systemPrompt: "You are a pirate." });
    await engine.handleMessage(agent, "user-1", "telegram", "Ahoy!");

    expect(capturedOpts).toBeDefined();
    expect(capturedOpts!.systemPrompt).toBe("You are a pirate.");
    expect(capturedOpts!.messages.length).toBe(1);
    expect(capturedOpts!.messages[0]!.content).toBe("Ahoy!");
  });
});
