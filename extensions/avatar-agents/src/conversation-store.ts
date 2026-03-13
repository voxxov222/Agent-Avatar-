/**
 * In-memory conversation store.
 * Tracks conversations per agent + external user pair.
 * A production deployment would back this with a database.
 */

import type { Conversation, ConversationMessage, IntegrationKind } from "./types.js";

/** Deterministic key for agent + external user + platform. */
function conversationKey(agentId: string, externalUserId: string, platform: IntegrationKind): string {
  return `${agentId}:${platform}:${externalUserId}`;
}

let nextId = 1;

export class ConversationStore {
  private conversations: Map<string, Conversation> = new Map();
  /** Secondary index: agentId -> conversation IDs. */
  private byAgent: Map<string, Set<string>> = new Map();

  /** Find or create a conversation for the given agent + user + platform. */
  findOrCreate(agentId: string, externalUserId: string, platform: IntegrationKind): Conversation {
    const key = conversationKey(agentId, externalUserId, platform);
    const existing = this.conversations.get(key);
    if (existing) return existing;

    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: `conv-${nextId++}`,
      agentId,
      externalUserId,
      platform,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(key, conversation);

    if (!this.byAgent.has(agentId)) {
      this.byAgent.set(agentId, new Set());
    }
    this.byAgent.get(agentId)!.add(key);

    return conversation;
  }

  /** Append a message to a conversation and update its timestamp. */
  addMessage(conversationId: string, message: ConversationMessage): boolean {
    for (const conv of this.conversations.values()) {
      if (conv.id === conversationId) {
        conv.messages.push(message);
        conv.updatedAt = new Date().toISOString();
        return true;
      }
    }
    return false;
  }

  /** Get all conversations for an agent. */
  listByAgent(agentId: string): Conversation[] {
    const keys = this.byAgent.get(agentId);
    if (!keys) return [];
    const result: Conversation[] = [];
    for (const key of keys) {
      const conv = this.conversations.get(key);
      if (conv) result.push(conv);
    }
    return result;
  }

  /** Get a conversation by its ID. */
  getById(conversationId: string): Conversation | undefined {
    for (const conv of this.conversations.values()) {
      if (conv.id === conversationId) return conv;
    }
    return undefined;
  }

  /** Total message count across all conversations for an agent. */
  messageCount(agentId: string): number {
    return this.listByAgent(agentId).reduce((sum, c) => sum + c.messages.length, 0);
  }
}
