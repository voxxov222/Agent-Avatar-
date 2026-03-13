import { describe, expect, it } from "vitest";

import { ConversationStore } from "./conversation-store.js";

describe("ConversationStore", () => {
  it("creates a new conversation on first access", () => {
    const store = new ConversationStore();
    const conv = store.findOrCreate("agent-1", "user-1", "discord");
    expect(conv.agentId).toBe("agent-1");
    expect(conv.externalUserId).toBe("user-1");
    expect(conv.platform).toBe("discord");
    expect(conv.messages).toEqual([]);
    expect(conv.id).toBeTruthy();
  });

  it("returns the same conversation for the same agent+user+platform", () => {
    const store = new ConversationStore();
    const conv1 = store.findOrCreate("agent-1", "user-1", "discord");
    const conv2 = store.findOrCreate("agent-1", "user-1", "discord");
    expect(conv1.id).toBe(conv2.id);
  });

  it("creates separate conversations for different platforms", () => {
    const store = new ConversationStore();
    const discord = store.findOrCreate("agent-1", "user-1", "discord");
    const slack = store.findOrCreate("agent-1", "user-1", "slack");
    expect(discord.id).not.toBe(slack.id);
  });

  it("adds messages to a conversation", () => {
    const store = new ConversationStore();
    const conv = store.findOrCreate("agent-1", "user-1", "web-widget");
    const added = store.addMessage(conv.id, {
      role: "user",
      content: "Hello",
      timestamp: Date.now(),
    });
    expect(added).toBe(true);
    expect(conv.messages.length).toBe(1);
    expect(conv.messages[0]!.content).toBe("Hello");
  });

  it("returns false when adding to nonexistent conversation", () => {
    const store = new ConversationStore();
    const added = store.addMessage("nonexistent", {
      role: "user",
      content: "Hello",
      timestamp: Date.now(),
    });
    expect(added).toBe(false);
  });

  it("lists conversations by agent", () => {
    const store = new ConversationStore();
    store.findOrCreate("agent-1", "user-1", "discord");
    store.findOrCreate("agent-1", "user-2", "discord");
    store.findOrCreate("agent-2", "user-1", "discord");

    const agent1Convs = store.listByAgent("agent-1");
    expect(agent1Convs.length).toBe(2);

    const agent2Convs = store.listByAgent("agent-2");
    expect(agent2Convs.length).toBe(1);
  });

  it("gets a conversation by ID", () => {
    const store = new ConversationStore();
    const conv = store.findOrCreate("agent-1", "user-1", "telegram");
    const found = store.getById(conv.id);
    expect(found).toBeDefined();
    expect(found!.agentId).toBe("agent-1");
  });

  it("counts messages across conversations for an agent", () => {
    const store = new ConversationStore();
    const conv1 = store.findOrCreate("agent-1", "user-1", "discord");
    const conv2 = store.findOrCreate("agent-1", "user-2", "discord");

    conv1.messages.push({ role: "user", content: "a", timestamp: 1 });
    conv1.messages.push({ role: "assistant", content: "b", timestamp: 2 });
    conv2.messages.push({ role: "user", content: "c", timestamp: 3 });

    expect(store.messageCount("agent-1")).toBe(3);
    expect(store.messageCount("agent-2")).toBe(0);
  });
});
