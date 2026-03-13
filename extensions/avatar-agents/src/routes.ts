/**
 * HTTP route handlers for the Avatar Agents API.
 * These are plain request handler functions that can be mounted on any
 * Express-compatible router via the plugin's gateway registration.
 */

import type { AgentStore, CreateAgentInput, UpdateAgentInput } from "./agent-store.js";
import type { AvatarRegistry } from "./avatar-registry.js";
import type { ConversationStore } from "./conversation-store.js";
import type { AnalyticsTracker } from "./analytics.js";
import type { AgentEngine } from "./agent-engine.js";
import type { IntegrationKind } from "./types.js";

// -- Helpers ------------------------------------------------------------------

type JsonBody = Record<string, unknown>;

function json(status: number, body: unknown): { status: number; body: unknown } {
  return { status, body };
}

function parseBody(raw: unknown): JsonBody {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as JsonBody;
  }
  return {};
}

// -- Route context (injected by the plugin) -----------------------------------

export type RouteContext = {
  agentStore: AgentStore;
  avatarRegistry: AvatarRegistry;
  conversationStore: ConversationStore;
  analytics: AnalyticsTracker;
  engine: AgentEngine;
};

// -- Agent routes -------------------------------------------------------------

export function listAgents(ctx: RouteContext, userId: string) {
  const agents = ctx.agentStore.listByUser(userId);
  return json(200, { agents });
}

export function createAgent(ctx: RouteContext, userId: string, rawBody: unknown) {
  const body = parseBody(rawBody);
  const input: CreateAgentInput = {
    userId,
    name: String(body["name"] ?? ""),
    description: String(body["description"] ?? ""),
    systemPrompt: String(body["systemPrompt"] ?? ""),
    personality: (body["personality"] as CreateAgentInput["personality"]) ?? "helpful",
    avatarConfig: (body["avatarConfig"] as CreateAgentInput["avatarConfig"]) ?? {
      modelId: "avatar-friendly-robot",
    },
    voiceConfig: body["voiceConfig"] as CreateAgentInput["voiceConfig"],
    integrations: body["integrations"] as CreateAgentInput["integrations"],
  };

  if (!input.name) {
    return json(400, { error: "name is required" });
  }

  const agent = ctx.agentStore.create(input);
  return json(201, { agent });
}

export function getAgent(ctx: RouteContext, agentId: string) {
  const agent = ctx.agentStore.get(agentId);
  if (!agent) return json(404, { error: "agent not found" });
  return json(200, { agent });
}

export function updateAgent(ctx: RouteContext, agentId: string, rawBody: unknown) {
  const body = parseBody(rawBody);
  const input: UpdateAgentInput = {};
  if (body["name"] !== undefined) input.name = String(body["name"]);
  if (body["description"] !== undefined) input.description = String(body["description"]);
  if (body["systemPrompt"] !== undefined) input.systemPrompt = String(body["systemPrompt"]);
  if (body["personality"] !== undefined) input.personality = body["personality"] as UpdateAgentInput["personality"];
  if (body["avatarConfig"] !== undefined) input.avatarConfig = body["avatarConfig"] as UpdateAgentInput["avatarConfig"];
  if (body["voiceConfig"] !== undefined) input.voiceConfig = body["voiceConfig"] as UpdateAgentInput["voiceConfig"];
  if (body["integrations"] !== undefined) input.integrations = body["integrations"] as UpdateAgentInput["integrations"];
  if (body["status"] !== undefined) input.status = body["status"] as UpdateAgentInput["status"];

  const agent = ctx.agentStore.update(agentId, input);
  if (!agent) return json(404, { error: "agent not found" });
  return json(200, { agent });
}

export function deleteAgent(ctx: RouteContext, agentId: string) {
  const deleted = ctx.agentStore.delete(agentId);
  if (!deleted) return json(404, { error: "agent not found" });
  return json(200, { ok: true });
}

// -- Avatar routes ------------------------------------------------------------

export function listAvatars(ctx: RouteContext) {
  return json(200, { avatars: ctx.avatarRegistry.list() });
}

export function getAvatarModel(ctx: RouteContext, avatarId: string) {
  const avatar = ctx.avatarRegistry.get(avatarId);
  if (!avatar) return json(404, { error: "avatar not found" });
  return json(200, { avatar });
}

// -- Conversation routes ------------------------------------------------------

export function listConversations(ctx: RouteContext, agentId: string) {
  const conversations = ctx.conversationStore.listByAgent(agentId);
  return json(200, { conversations });
}

// -- Analytics routes ---------------------------------------------------------

export function getAgentAnalytics(ctx: RouteContext, agentId: string) {
  const agent = ctx.agentStore.get(agentId);
  if (!agent) return json(404, { error: "agent not found" });
  const analytics = ctx.analytics.getAnalytics(agentId);
  return json(200, { analytics });
}

// -- Message handling (web widget / webhook) ----------------------------------

export async function handleWidgetMessage(
  ctx: RouteContext,
  agentId: string,
  rawBody: unknown,
): Promise<{ status: number; body: unknown }> {
  const body = parseBody(rawBody);
  const agent = ctx.agentStore.get(agentId);
  if (!agent) return json(404, { error: "agent not found" });
  if (agent.status !== "active") return json(403, { error: "agent is not active" });

  const userMessage = String(body["message"] ?? "");
  const externalUserId = String(body["userId"] ?? "anonymous");

  if (!userMessage) return json(400, { error: "message is required" });

  const response = await ctx.engine.handleMessage(agent, externalUserId, "web-widget", userMessage);
  return json(200, { response });
}

export async function handleDiscordWebhook(
  ctx: RouteContext,
  agentId: string,
  rawBody: unknown,
): Promise<{ status: number; body: unknown }> {
  const body = parseBody(rawBody);
  const agent = ctx.agentStore.get(agentId);
  if (!agent) return json(404, { error: "agent not found" });
  if (agent.status !== "active") return json(403, { error: "agent is not active" });

  const userMessage = String(body["content"] ?? "");
  const externalUserId = String(body["authorId"] ?? "");
  const platform: IntegrationKind = "discord";

  if (!userMessage) return json(400, { error: "content is required" });

  const response = await ctx.engine.handleMessage(agent, externalUserId, platform, userMessage);
  return json(200, { response });
}
