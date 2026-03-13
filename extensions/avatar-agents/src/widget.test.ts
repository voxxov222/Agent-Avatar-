import { describe, expect, it } from "vitest";

import { generateWidgetEmbed, generateWidgetLoaderScript } from "./widget.js";

describe("generateWidgetEmbed", () => {
  it("generates a script tag with correct data attributes", () => {
    const embed = generateWidgetEmbed({
      agentId: "agent-123",
      apiBaseUrl: "https://api.example.com",
    });

    expect(embed).toContain("agent-123");
    expect(embed).toContain("https://api.example.com");
    expect(embed).toContain("widget/loader.js");
    expect(embed).toContain("dataset.agentId");
    expect(embed).toContain("<script>");
  });

  it("uses custom position and color", () => {
    const embed = generateWidgetEmbed({
      agentId: "agent-1",
      apiBaseUrl: "https://api.example.com",
      position: "bottom-left",
      primaryColor: "#ff0000",
      title: "Help Bot",
    });

    expect(embed).toContain("bottom-left");
    expect(embed).toContain("#ff0000");
    expect(embed).toContain("Help Bot");
  });

  it("derives WebSocket URL from API base", () => {
    const embed = generateWidgetEmbed({
      agentId: "agent-1",
      apiBaseUrl: "https://api.example.com",
    });

    expect(embed).toContain("wss://api.example.com/ws");
  });

  it("uses explicit WebSocket URL when provided", () => {
    const embed = generateWidgetEmbed({
      agentId: "agent-1",
      apiBaseUrl: "https://api.example.com",
      wsUrl: "wss://custom-ws.example.com",
    });

    expect(embed).toContain("wss://custom-ws.example.com");
  });
});

describe("generateWidgetLoaderScript", () => {
  it("generates a self-executing function", () => {
    const script = generateWidgetLoaderScript({
      widgetPageUrl: "https://widget.example.com/chat",
    });

    expect(script).toContain("(function()");
    expect(script).toContain("avatar-agent-toggle");
    expect(script).toContain("avatar-agent-container");
    expect(script).toContain("https://widget.example.com/chat");
  });

  it("creates a toggle button and iframe container", () => {
    const script = generateWidgetLoaderScript({
      widgetPageUrl: "https://widget.example.com/chat",
    });

    expect(script).toContain("createElement");
    expect(script).toContain("iframe");
    expect(script).toContain("addEventListener");
  });
});
