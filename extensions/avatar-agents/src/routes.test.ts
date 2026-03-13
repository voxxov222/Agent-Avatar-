import { describe, expect, it } from "vitest";

import { AgentStore } from "./agent-store.js";
import { AgentEngine } from "./agent-engine.js";
import { AnalyticsTracker } from "./analytics.js";
import { AvatarRegistry } from "./avatar-registry.js";
import { ConversationStore } from "./conversation-store.js";
import type { RouteContext } from "./routes.js";
import {
  listAgents,
  createAgent,
  getAgent,
  updateAgent,
  deleteAgent,
  listAvatars,
  getAvatarModel,
  listConversations,
  getAgentAnalytics,
  handleWidgetMessage,
  handleDiscordWebhook,
} from "./routes.js";

function createContext(): RouteContext {
  const conversationStore = new ConversationStore();
  const analytics = new AnalyticsTracker();
  return {
    agentStore: new AgentStore(),
    avatarRegistry: new AvatarRegistry(),
    conversationStore,
    analytics,
    engine: new AgentEngine({
      conversationStore,
      analytics,
      llmCaller: async () => "Mock response",
    }),
  };
}

describe("Agent routes", () => {
  it("creates and lists agents", () => {
    const ctx = createContext();
    const createResult = createAgent(ctx, "user-1", {
      name: "Test Bot",
      description: "A test bot",
      systemPrompt: "Be helpful",
    });
    expect(createResult.status).toBe(201);

    const listResult = listAgents(ctx, "user-1");
    expect(listResult.status).toBe(200);
    const body = listResult.body as { agents: unknown[] };
    expect(body.agents.length).toBe(1);
  });

  it("rejects agent creation without name", () => {
    const ctx = createContext();
    const result = createAgent(ctx, "user-1", { description: "No name" });
    expect(result.status).toBe(400);
  });

  it("gets an agent by ID", () => {
    const ctx = createContext();
    const created = createAgent(ctx, "user-1", { name: "Bot" });
    const agent = (created.body as { agent: { id: string } }).agent;

    const result = getAgent(ctx, agent.id);
    expect(result.status).toBe(200);
  });

  it("returns 404 for unknown agent", () => {
    const ctx = createContext();
    expect(getAgent(ctx, "nonexistent").status).toBe(404);
  });

  it("updates an agent", () => {
    const ctx = createContext();
    const created = createAgent(ctx, "user-1", { name: "Bot" });
    const agent = (created.body as { agent: { id: string } }).agent;

    const result = updateAgent(ctx, agent.id, { name: "Updated Bot" });
    expect(result.status).toBe(200);
    const updated = (result.body as { agent: { name: string } }).agent;
    expect(updated.name).toBe("Updated Bot");
  });

  it("deletes an agent", () => {
    const ctx = createContext();
    const created = createAgent(ctx, "user-1", { name: "Bot" });
    const agent = (created.body as { agent: { id: string } }).agent;

    expect(deleteAgent(ctx, agent.id).status).toBe(200);
    expect(getAgent(ctx, agent.id).status).toBe(404);
  });
});

describe("Avatar routes", () => {
  it("lists built-in avatars", () => {
    const ctx = createContext();
    const result = listAvatars(ctx);
    expect(result.status).toBe(200);
    const body = result.body as { avatars: unknown[] };
    expect(body.avatars.length).toBe(3);
  });

  it("gets an avatar by ID", () => {
    const ctx = createContext();
    const result = getAvatarModel(ctx, "avatar-friendly-robot");
    expect(result.status).toBe(200);
  });

  it("returns 404 for unknown avatar", () => {
    const ctx = createContext();
    expect(getAvatarModel(ctx, "nonexistent").status).toBe(404);
  });
});

describe("Conversation routes", () => {
  it("lists conversations for an agent", () => {
    const ctx = createContext();
    // Create an agent and a conversation.
    const created = createAgent(ctx, "user-1", { name: "Bot" });
    const agent = (created.body as { agent: { id: string } }).agent;
    ctx.conversationStore.findOrCreate(agent.id, "ext-user-1", "discord");

    const result = listConversations(ctx, agent.id);
    expect(result.status).toBe(200);
    const body = result.body as { conversations: unknown[] };
    expect(body.conversations.length).toBe(1);
  });
});

describe("Analytics routes", () => {
  it("returns analytics for an agent", () => {
    const ctx = createContext();
    const created = createAgent(ctx, "user-1", { name: "Bot" });
    const agent = (created.body as { agent: { id: string } }).agent;

    ctx.analytics.recordMessage(agent.id, "discord", 100);

    const result = getAgentAnalytics(ctx, agent.id);
    expect(result.status).toBe(200);
    const body = result.body as { analytics: { totalMessages: number } };
    expect(body.analytics.totalMessages).toBe(1);
  });

  it("returns 404 for unknown agent analytics", () => {
    const ctx = createContext();
    expect(getAgentAnalytics(ctx, "nonexistent").status).toBe(404);
  });
});

describe("Widget message handler", () => {
  it("handles a widget message", async () => {
    const ctx = createContext();
    const created = createAgent(ctx, "user-1", {
      name: "Widget Bot",
      systemPrompt: "Be helpful",
    });
    const agent = (created.body as { agent: { id: string } }).agent;

    const result = await handleWidgetMessage(ctx, agent.id, {
      message: "Hello",
      userId: "visitor-1",
    });
    expect(result.status).toBe(200);
    const body = result.body as { response: { message: string; animation: string } };
    expect(body.response.message).toBe("Mock response");
  });

  it("returns 404 for unknown agent", async () => {
    const ctx = createContext();
    const result = await handleWidgetMessage(ctx, "nonexistent", { message: "Hi" });
    expect(result.status).toBe(404);
  });

  it("returns 400 for empty message", async () => {
    const ctx = createContext();
    const created = createAgent(ctx, "user-1", { name: "Bot" });
    const agent = (created.body as { agent: { id: string } }).agent;

    const result = await handleWidgetMessage(ctx, agent.id, { message: "" });
    expect(result.status).toBe(400);
  });

  it("returns 403 for paused agent", async () => {
    const ctx = createContext();
    const created = createAgent(ctx, "user-1", { name: "Bot" });
    const agent = (created.body as { agent: { id: string } }).agent;
    ctx.agentStore.update(agent.id, { status: "paused" });

    const result = await handleWidgetMessage(ctx, agent.id, { message: "Hi" });
    expect(result.status).toBe(403);
  });
});

describe("Discord webhook handler", () => {
  it("handles a Discord webhook message", async () => {
    const ctx = createContext();
    const created = createAgent(ctx, "user-1", {
      name: "Discord Bot",
      systemPrompt: "Be helpful",
    });
    const agent = (created.body as { agent: { id: string } }).agent;

    const result = await handleDiscordWebhook(ctx, agent.id, {
      content: "Hello from Discord",
      authorId: "discord-user-123",
    });
    expect(result.status).toBe(200);
    const body = result.body as { response: { message: string } };
    expect(body.response.message).toBe("Mock response");
  });
});
