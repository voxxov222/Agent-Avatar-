/**
 * Lightweight in-memory analytics tracker for avatar agents.
 * Tracks message counts, response times, and per-platform breakdowns.
 */

import type { AgentAnalytics, IntegrationKind } from "./types.js";

type AgentStats = {
  totalMessages: number;
  messagesThisMonth: number;
  monthKey: string;
  responseTimes: number[];
  messagesByHour: Record<number, number>;
  messagesByPlatform: Record<string, number>;
};

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export class AnalyticsTracker {
  private stats: Map<string, AgentStats> = new Map();

  private getOrCreate(agentId: string): AgentStats {
    let s = this.stats.get(agentId);
    if (!s) {
      s = {
        totalMessages: 0,
        messagesThisMonth: 0,
        monthKey: currentMonthKey(),
        responseTimes: [],
        messagesByHour: {},
        messagesByPlatform: {},
      };
      this.stats.set(agentId, s);
    }
    // Roll over month counter if needed.
    const mk = currentMonthKey();
    if (s.monthKey !== mk) {
      s.messagesThisMonth = 0;
      s.monthKey = mk;
    }
    return s;
  }

  /** Record a single message interaction. */
  recordMessage(agentId: string, platform: IntegrationKind, responseTimeMs: number): void {
    const s = this.getOrCreate(agentId);
    s.totalMessages++;
    s.messagesThisMonth++;
    s.responseTimes.push(responseTimeMs);

    const hour = new Date().getHours();
    s.messagesByHour[hour] = (s.messagesByHour[hour] ?? 0) + 1;
    s.messagesByPlatform[platform] = (s.messagesByPlatform[platform] ?? 0) + 1;
  }

  /** Get analytics snapshot for an agent. */
  getAnalytics(agentId: string): AgentAnalytics {
    const s = this.getOrCreate(agentId);
    const avgResponseTime =
      s.responseTimes.length > 0
        ? s.responseTimes.reduce((a, b) => a + b, 0) / s.responseTimes.length
        : 0;

    return {
      agentId,
      totalMessages: s.totalMessages,
      messagesThisMonth: s.messagesThisMonth,
      averageResponseTimeMs: Math.round(avgResponseTime),
      topQuestions: [], // Would require NLP clustering in production.
      messagesByHour: { ...s.messagesByHour },
      messagesByPlatform: s.messagesByPlatform as Record<IntegrationKind, number>,
    };
  }

  /** Check if an agent has exceeded its monthly message quota. */
  isOverQuota(agentId: string, limit: number): boolean {
    const s = this.getOrCreate(agentId);
    return s.messagesThisMonth >= limit;
  }
}
