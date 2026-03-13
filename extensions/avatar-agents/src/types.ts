/** Core types for the Avatar Agents extension. */

// -- Plan tiers ---------------------------------------------------------------

export type PlanTier = "free" | "pro" | "enterprise";

export const PLAN_LIMITS: Record<PlanTier, { maxAgents: number; maxMessagesPerMonth: number }> = {
  free: { maxAgents: 1, maxMessagesPerMonth: 1_000 },
  pro: { maxAgents: 50, maxMessagesPerMonth: 100_000 },
  enterprise: { maxAgents: Infinity, maxMessagesPerMonth: Infinity },
};

// -- Avatar -------------------------------------------------------------------

export type AvatarAnimationKind = "idle" | "talking" | "thinking" | "celebrating" | "waving";

export type AvatarCustomization = {
  skinTone?: string;
  hairColor?: string;
  clothingColor?: string;
  accessories?: string[];
};

export type AvatarModel = {
  id: string;
  name: string;
  /** URL to the glTF/GLB file (S3, R2, or local path). */
  modelUrl: string;
  /** URL to a preview thumbnail image. */
  previewImageUrl: string;
  /** Whether the model supports color/accessory customization. */
  customizable: boolean;
  /** Available animation clip names embedded in the model. */
  animations: AvatarAnimationKind[];
  createdAt: string;
};

export type AvatarConfig = {
  modelId: string;
  customization?: AvatarCustomization;
  /** Resolved preview URL (may differ from base model after customization). */
  previewUrl?: string;
};

// -- Voice --------------------------------------------------------------------

export type VoiceProvider = "edge-tts" | "elevenlabs";

export type VoiceConfig = {
  provider: VoiceProvider;
  voiceId: string;
  speed?: number;
};

// -- Agent --------------------------------------------------------------------

export type AgentPersonality = "friendly" | "professional" | "sarcastic" | "helpful" | "custom";

export type IntegrationKind = "discord" | "slack" | "telegram" | "web-widget";

export type DiscordIntegration = {
  kind: "discord";
  botToken: string;
  guildId?: string;
};

export type SlackIntegration = {
  kind: "slack";
  botToken: string;
  signingSecret: string;
};

export type TelegramIntegration = {
  kind: "telegram";
  botToken: string;
};

export type WebWidgetIntegration = {
  kind: "web-widget";
  allowedOrigins: string[];
};

export type Integration =
  | DiscordIntegration
  | SlackIntegration
  | TelegramIntegration
  | WebWidgetIntegration;

export type AgentStatus = "active" | "paused" | "archived";

export type AgentConfig = {
  id: string;
  userId: string;
  name: string;
  description: string;
  systemPrompt: string;
  personality: AgentPersonality;
  avatarConfig: AvatarConfig;
  voiceConfig?: VoiceConfig;
  integrations: Integration[];
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
};

// -- Conversation -------------------------------------------------------------

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

export type Conversation = {
  id: string;
  agentId: string;
  /** External user identifier (Discord user ID, Slack user ID, etc.). */
  externalUserId: string;
  platform: IntegrationKind;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
};

// -- Analytics ----------------------------------------------------------------

export type AgentAnalytics = {
  agentId: string;
  totalMessages: number;
  messagesThisMonth: number;
  averageResponseTimeMs: number;
  topQuestions: Array<{ question: string; count: number }>;
  messagesByHour: Record<number, number>;
  messagesByPlatform: Record<IntegrationKind, number>;
};

// -- Agent execution result ---------------------------------------------------

export type AgentResponse = {
  message: string;
  animation: AvatarAnimationKind;
  timestamp: number;
  responseTimeMs: number;
};
