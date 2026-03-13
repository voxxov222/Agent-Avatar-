import { describe, expect, it } from "vitest";

import { AnalyticsTracker } from "./analytics.js";

describe("AnalyticsTracker", () => {
  it("records messages and computes analytics", () => {
    const tracker = new AnalyticsTracker();
    tracker.recordMessage("agent-1", "discord", 100);
    tracker.recordMessage("agent-1", "discord", 200);
    tracker.recordMessage("agent-1", "slack", 150);

    const stats = tracker.getAnalytics("agent-1");
    expect(stats.totalMessages).toBe(3);
    expect(stats.messagesThisMonth).toBe(3);
    expect(stats.averageResponseTimeMs).toBe(150); // (100+200+150)/3
    expect(stats.messagesByPlatform["discord"]).toBe(2);
    expect(stats.messagesByPlatform["slack"]).toBe(1);
  });

  it("returns zero stats for unknown agent", () => {
    const tracker = new AnalyticsTracker();
    const stats = tracker.getAnalytics("unknown");
    expect(stats.totalMessages).toBe(0);
    expect(stats.averageResponseTimeMs).toBe(0);
  });

  it("tracks messages by hour", () => {
    const tracker = new AnalyticsTracker();
    tracker.recordMessage("agent-1", "web-widget", 50);
    const stats = tracker.getAnalytics("agent-1");
    const currentHour = new Date().getHours();
    expect(stats.messagesByHour[currentHour]).toBe(1);
  });

  it("checks quota limits", () => {
    const tracker = new AnalyticsTracker();
    expect(tracker.isOverQuota("agent-1", 1000)).toBe(false);

    for (let i = 0; i < 5; i++) {
      tracker.recordMessage("agent-1", "discord", 100);
    }
    expect(tracker.isOverQuota("agent-1", 5)).toBe(true);
    expect(tracker.isOverQuota("agent-1", 10)).toBe(false);
  });

  it("handles infinite quota", () => {
    const tracker = new AnalyticsTracker();
    tracker.recordMessage("agent-1", "discord", 100);
    expect(tracker.isOverQuota("agent-1", Infinity)).toBe(false);
  });
});
