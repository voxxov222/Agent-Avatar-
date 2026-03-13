import { describe, expect, it } from "vitest";

import { AgentStore } from "./agent-store.js";

describe("AgentStore", () => {
  it("creates an agent", () => {
    const store = new AgentStore();
    const agent = store.create({
      userId: "user-1",
      name: "Support Bot",
      description: "Customer support agent",
      systemPrompt: "You are a helpful support agent.",
      personality: "professional",
      avatarConfig: { modelId: "avatar-professional-bot" },
    });

    expect(agent.id).toBeTruthy();
    expect(agent.name).toBe("Support Bot");
    expect(agent.status).toBe("active");
    expect(agent.integrations).toEqual([]);
  });

  it("gets an agent by ID", () => {
    const store = new AgentStore();
    const created = store.create({
      userId: "user-1",
      name: "Bot",
      description: "",
      systemPrompt: "",
      personality: "helpful",
      avatarConfig: { modelId: "avatar-friendly-robot" },
    });

    const found = store.get(created.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Bot");
  });

  it("returns undefined for unknown ID", () => {
    const store = new AgentStore();
    expect(store.get("nonexistent")).toBeUndefined();
  });

  it("lists agents by user", () => {
    const store = new AgentStore();
    store.create({
      userId: "user-1",
      name: "Bot A",
      description: "",
      systemPrompt: "",
      personality: "helpful",
      avatarConfig: { modelId: "avatar-friendly-robot" },
    });
    store.create({
      userId: "user-1",
      name: "Bot B",
      description: "",
      systemPrompt: "",
      personality: "friendly",
      avatarConfig: { modelId: "avatar-cute-character" },
    });
    store.create({
      userId: "user-2",
      name: "Bot C",
      description: "",
      systemPrompt: "",
      personality: "sarcastic",
      avatarConfig: { modelId: "avatar-professional-bot" },
    });

    expect(store.listByUser("user-1").length).toBe(2);
    expect(store.listByUser("user-2").length).toBe(1);
    expect(store.listByUser("user-3").length).toBe(0);
  });

  it("updates an agent", () => {
    const store = new AgentStore();
    const agent = store.create({
      userId: "user-1",
      name: "Original",
      description: "Original desc",
      systemPrompt: "Original prompt",
      personality: "helpful",
      avatarConfig: { modelId: "avatar-friendly-robot" },
    });

    const updated = store.update(agent.id, {
      name: "Updated",
      status: "paused",
    });

    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Updated");
    expect(updated!.status).toBe("paused");
    expect(updated!.description).toBe("Original desc");
  });

  it("returns undefined when updating nonexistent agent", () => {
    const store = new AgentStore();
    expect(store.update("nonexistent", { name: "X" })).toBeUndefined();
  });

  it("deletes an agent", () => {
    const store = new AgentStore();
    const agent = store.create({
      userId: "user-1",
      name: "Deletable",
      description: "",
      systemPrompt: "",
      personality: "helpful",
      avatarConfig: { modelId: "avatar-friendly-robot" },
    });

    expect(store.delete(agent.id)).toBe(true);
    expect(store.get(agent.id)).toBeUndefined();
    expect(store.listByUser("user-1").length).toBe(0);
  });

  it("returns false when deleting nonexistent agent", () => {
    const store = new AgentStore();
    expect(store.delete("nonexistent")).toBe(false);
  });

  it("counts agents by user", () => {
    const store = new AgentStore();
    expect(store.countByUser("user-1")).toBe(0);

    store.create({
      userId: "user-1",
      name: "Bot",
      description: "",
      systemPrompt: "",
      personality: "helpful",
      avatarConfig: { modelId: "avatar-friendly-robot" },
    });
    expect(store.countByUser("user-1")).toBe(1);
  });
});
