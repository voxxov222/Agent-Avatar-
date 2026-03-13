/**
 * Avatar Agents extension entry point.
 * Registers the plugin with the Clawdbot plugin system and exposes
 * HTTP routes for agent management, avatar browsing, and widget serving.
 */

import type { IncomingMessage, ServerResponse } from "node:http";

import type { ClawdbotPluginApi } from "clawdbot/plugin-sdk";
import { emptyPluginConfigSchema } from "clawdbot/plugin-sdk";

import { AgentStore } from "./src/agent-store.js";
import { AgentEngine } from "./src/agent-engine.js";
import { AnalyticsTracker } from "./src/analytics.js";
import { AvatarRegistry } from "./src/avatar-registry.js";
import { ConversationStore } from "./src/conversation-store.js";
import { AvatarWsBroadcaster } from "./src/websocket.js";
import { setAvatarAgentsRuntime } from "./src/runtime.js";
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
} from "./src/routes.js";
import type { RouteContext } from "./src/routes.js";

/** Read the full request body as a parsed JSON object. */
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw) return {};
  return JSON.parse(raw);
}

/** Write a JSON response. */
function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

/** Extract a path segment after a prefix, e.g. "/agents/agent-1" -> "agent-1". */
function extractIdFromPath(url: string, prefix: string): string {
  const path = new URL(url, "http://localhost").pathname;
  const after = path.slice(prefix.length);
  // Remove leading slash and any trailing segments.
  const segments = after.replace(/^\//, "").split("/");
  return segments[0] ?? "";
}

const plugin = {
  id: "avatar-agents",
  name: "Avatar Agents",
  description: "Deploy AI agents with custom interactive 3D avatars across Discord, Slack, Telegram, and web widgets",
  configSchema: emptyPluginConfigSchema(),

  register(api: ClawdbotPluginApi) {
    setAvatarAgentsRuntime(api.runtime);

    // Initialize stores and services.
    const agentStore = new AgentStore();
    const avatarRegistry = new AvatarRegistry();
    const conversationStore = new ConversationStore();
    const analytics = new AnalyticsTracker();
    const _wsBroadcaster = new AvatarWsBroadcaster();
    const engine = new AgentEngine({ conversationStore, analytics });

    const ctx: RouteContext = {
      agentStore,
      avatarRegistry,
      conversationStore,
      analytics,
      engine,
    };

    const BASE = "/plugins/avatar-agents";

    // -- Agent CRUD routes --

    api.registerHttpRoute({
      path: `${BASE}/agents`,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        const userId = "default-user";
        if (req.method === "POST") {
          const body = await readJsonBody(req);
          const result = createAgent(ctx, userId, body);
          sendJson(res, result.status, result.body);
          return;
        }
        // GET (default)
        const result = listAgents(ctx, userId);
        sendJson(res, result.status, result.body);
      },
    });

    api.registerHttpRoute({
      path: `${BASE}/agents/by-id`,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? "", "http://localhost");
        const agentId = url.searchParams.get("id") ?? "";

        if (req.method === "PATCH") {
          const body = await readJsonBody(req);
          const result = updateAgent(ctx, agentId, body);
          sendJson(res, result.status, result.body);
          return;
        }
        if (req.method === "DELETE") {
          const result = deleteAgent(ctx, agentId);
          sendJson(res, result.status, result.body);
          return;
        }
        // GET
        const result = getAgent(ctx, agentId);
        sendJson(res, result.status, result.body);
      },
    });

    // -- Avatar routes --

    api.registerHttpRoute({
      path: `${BASE}/avatars`,
      handler: (_req: IncomingMessage, res: ServerResponse) => {
        const result = listAvatars(ctx);
        sendJson(res, result.status, result.body);
      },
    });

    api.registerHttpRoute({
      path: `${BASE}/avatars/by-id`,
      handler: (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? "", "http://localhost");
        const avatarId = url.searchParams.get("id") ?? "";
        const result = getAvatarModel(ctx, avatarId);
        sendJson(res, result.status, result.body);
      },
    });

    // -- Conversation routes --

    api.registerHttpRoute({
      path: `${BASE}/conversations`,
      handler: (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? "", "http://localhost");
        const agentId = url.searchParams.get("agentId") ?? "";
        const result = listConversations(ctx, agentId);
        sendJson(res, result.status, result.body);
      },
    });

    // -- Analytics routes --

    api.registerHttpRoute({
      path: `${BASE}/analytics`,
      handler: (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? "", "http://localhost");
        const agentId = url.searchParams.get("agentId") ?? "";
        const result = getAgentAnalytics(ctx, agentId);
        sendJson(res, result.status, result.body);
      },
    });

    // -- Widget message endpoint --

    api.registerHttpRoute({
      path: `${BASE}/widget/message`,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? "", "http://localhost");
        const agentId = url.searchParams.get("agentId") ?? "";
        const body = await readJsonBody(req);

        // Broadcast typing indicator.
        _wsBroadcaster.sendTyping(agentId, true);

        const result = await handleWidgetMessage(ctx, agentId, body);

        _wsBroadcaster.sendTyping(agentId, false);
        if (result.status === 200) {
          const responseBody = result.body as { response: { animation: string } };
          _wsBroadcaster.sendAnimation(
            agentId,
            responseBody.response.animation as "idle" | "talking" | "thinking" | "celebrating" | "waving",
          );
        }

        sendJson(res, result.status, result.body);
      },
    });

    // -- Discord webhook endpoint --

    api.registerHttpRoute({
      path: `${BASE}/discord/webhook`,
      handler: async (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? "", "http://localhost");
        const agentId = url.searchParams.get("agentId") ?? "";
        const body = await readJsonBody(req);
        const result = await handleDiscordWebhook(ctx, agentId, body);
        sendJson(res, result.status, result.body);
      },
    });

    api.logger.info("[avatar-agents] Plugin registered with HTTP routes");
  },
};

export default plugin;
