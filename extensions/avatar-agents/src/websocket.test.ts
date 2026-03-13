import { describe, expect, it } from "vitest";

import { AvatarWsBroadcaster } from "./websocket.js";
import type { WsClient, WsEvent } from "./websocket.js";

function createMockClient(agentId: string): WsClient & { received: string[] } {
  const received: string[] = [];
  return {
    agentId,
    send: (data: string) => received.push(data),
    received,
  };
}

describe("AvatarWsBroadcaster", () => {
  it("adds and removes clients", () => {
    const broadcaster = new AvatarWsBroadcaster();
    const client = createMockClient("agent-1");

    broadcaster.addClient(client);
    expect(broadcaster.clientCount).toBe(1);

    broadcaster.removeClient(client);
    expect(broadcaster.clientCount).toBe(0);
  });

  it("broadcasts animation events to matching clients", () => {
    const broadcaster = new AvatarWsBroadcaster();
    const client1 = createMockClient("agent-1");
    const client2 = createMockClient("agent-1");
    const client3 = createMockClient("agent-2");

    broadcaster.addClient(client1);
    broadcaster.addClient(client2);
    broadcaster.addClient(client3);

    broadcaster.sendAnimation("agent-1", "talking");

    expect(client1.received.length).toBe(1);
    expect(client2.received.length).toBe(1);
    expect(client3.received.length).toBe(0);

    const event: WsEvent = JSON.parse(client1.received[0]!);
    expect(event.type).toBe("animation");
    expect(event.agentId).toBe("agent-1");
    if (event.type === "animation") {
      expect(event.animation).toBe("talking");
    }
  });

  it("broadcasts typing events", () => {
    const broadcaster = new AvatarWsBroadcaster();
    const client = createMockClient("agent-1");
    broadcaster.addClient(client);

    broadcaster.sendTyping("agent-1", true);

    expect(client.received.length).toBe(1);
    const event: WsEvent = JSON.parse(client.received[0]!);
    expect(event.type).toBe("typing");
    if (event.type === "typing") {
      expect(event.isTyping).toBe(true);
    }
  });

  it("counts clients per agent", () => {
    const broadcaster = new AvatarWsBroadcaster();
    broadcaster.addClient(createMockClient("agent-1"));
    broadcaster.addClient(createMockClient("agent-1"));
    broadcaster.addClient(createMockClient("agent-2"));

    expect(broadcaster.clientCountForAgent("agent-1")).toBe(2);
    expect(broadcaster.clientCountForAgent("agent-2")).toBe(1);
    expect(broadcaster.clientCountForAgent("agent-3")).toBe(0);
  });

  it("handles client send errors gracefully", () => {
    const broadcaster = new AvatarWsBroadcaster();
    const badClient: WsClient = {
      agentId: "agent-1",
      send: () => {
        throw new Error("disconnected");
      },
    };
    broadcaster.addClient(badClient);

    // Should not throw.
    broadcaster.sendAnimation("agent-1", "idle");
    // Bad client should be removed.
    expect(broadcaster.clientCount).toBe(0);
  });
});
