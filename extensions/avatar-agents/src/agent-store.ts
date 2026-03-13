/**
 * In-memory agent configuration store.
 * Manages CRUD operations for agent configs.
 */

import type { AgentConfig, AgentStatus, AvatarConfig, Integration, VoiceConfig } from "./types.js";

let nextId = 1;

export type CreateAgentInput = {
  userId: string;
  name: string;
  description: string;
  systemPrompt: string;
  personality: AgentConfig["personality"];
  avatarConfig: AvatarConfig;
  voiceConfig?: VoiceConfig;
  integrations?: Integration[];
};

export type UpdateAgentInput = Partial<
  Pick<
    AgentConfig,
    "name" | "description" | "systemPrompt" | "personality" | "avatarConfig" | "voiceConfig" | "integrations" | "status"
  >
>;

export class AgentStore {
  private agents: Map<string, AgentConfig> = new Map();
  /** Secondary index: userId -> agent IDs. */
  private byUser: Map<string, Set<string>> = new Map();

  /** Create a new agent and return it. */
  create(input: CreateAgentInput): AgentConfig {
    const now = new Date().toISOString();
    const id = `agent-${nextId++}`;
    const agent: AgentConfig = {
      id,
      userId: input.userId,
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
      personality: input.personality,
      avatarConfig: input.avatarConfig,
      voiceConfig: input.voiceConfig,
      integrations: input.integrations ?? [],
      status: "active" as AgentStatus,
      createdAt: now,
      updatedAt: now,
    };
    this.agents.set(id, agent);

    if (!this.byUser.has(input.userId)) {
      this.byUser.set(input.userId, new Set());
    }
    this.byUser.get(input.userId)!.add(id);

    return agent;
  }

  /** Get an agent by ID. */
  get(id: string): AgentConfig | undefined {
    return this.agents.get(id);
  }

  /** List all agents for a user. */
  listByUser(userId: string): AgentConfig[] {
    const ids = this.byUser.get(userId);
    if (!ids) return [];
    const result: AgentConfig[] = [];
    for (const id of ids) {
      const agent = this.agents.get(id);
      if (agent) result.push(agent);
    }
    return result;
  }

  /** Update an agent. Returns the updated agent or undefined if not found. */
  update(id: string, input: UpdateAgentInput): AgentConfig | undefined {
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    if (input.name !== undefined) agent.name = input.name;
    if (input.description !== undefined) agent.description = input.description;
    if (input.systemPrompt !== undefined) agent.systemPrompt = input.systemPrompt;
    if (input.personality !== undefined) agent.personality = input.personality;
    if (input.avatarConfig !== undefined) agent.avatarConfig = input.avatarConfig;
    if (input.voiceConfig !== undefined) agent.voiceConfig = input.voiceConfig;
    if (input.integrations !== undefined) agent.integrations = input.integrations;
    if (input.status !== undefined) agent.status = input.status;
    agent.updatedAt = new Date().toISOString();

    return agent;
  }

  /** Delete an agent. Returns true if it existed. */
  delete(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;
    this.agents.delete(id);
    this.byUser.get(agent.userId)?.delete(id);
    return true;
  }

  /** Total number of agents for a user. */
  countByUser(userId: string): number {
    return this.byUser.get(userId)?.size ?? 0;
  }
}
