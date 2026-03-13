/**
 * WebSocket handler for real-time avatar animation sync.
 * Clients connect to receive animation cues when the agent responds.
 */

import type { AvatarAnimationKind } from "./types.js";

/** A connected WebSocket client watching a specific agent. */
export type WsClient = {
  agentId: string;
  send: (data: string) => void;
};

export type AnimationEvent = {
  type: "animation";
  agentId: string;
  animation: AvatarAnimationKind;
  timestamp: number;
};

export type TypingEvent = {
  type: "typing";
  agentId: string;
  isTyping: boolean;
};

export type WsEvent = AnimationEvent | TypingEvent;

/**
 * Manages WebSocket subscriptions for avatar animation events.
 * Clients subscribe to a specific agent ID and receive animation cues
 * whenever the agent produces a response.
 */
export class AvatarWsBroadcaster {
  private clients: Set<WsClient> = new Set();

  /** Register a new client. */
  addClient(client: WsClient): void {
    this.clients.add(client);
  }

  /** Remove a disconnected client. */
  removeClient(client: WsClient): void {
    this.clients.delete(client);
  }

  /** Broadcast an event to all clients watching the given agent. */
  broadcast(agentId: string, event: WsEvent): void {
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.agentId === agentId) {
        try {
          client.send(payload);
        } catch {
          // Client disconnected; remove on next sweep.
          this.clients.delete(client);
        }
      }
    }
  }

  /** Send a typing indicator to all clients watching the given agent. */
  sendTyping(agentId: string, isTyping: boolean): void {
    this.broadcast(agentId, {
      type: "typing",
      agentId,
      isTyping,
    });
  }

  /** Send an animation cue to all clients watching the given agent. */
  sendAnimation(agentId: string, animation: AvatarAnimationKind): void {
    this.broadcast(agentId, {
      type: "animation",
      agentId,
      animation,
      timestamp: Date.now(),
    });
  }

  /** Number of connected clients. */
  get clientCount(): number {
    return this.clients.size;
  }

  /** Number of clients watching a specific agent. */
  clientCountForAgent(agentId: string): number {
    let count = 0;
    for (const client of this.clients) {
      if (client.agentId === agentId) count++;
    }
    return count;
  }
}
