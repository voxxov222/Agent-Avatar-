/**
 * In-memory avatar model registry.
 * Ships with a set of built-in base avatars; users can register custom models.
 */

import type { AvatarModel } from "./types.js";

const builtinAvatars: AvatarModel[] = [
  {
    id: "avatar-friendly-robot",
    name: "Friendly Robot",
    modelUrl: "/avatars/models/friendly-robot.glb",
    previewImageUrl: "/avatars/previews/friendly-robot.png",
    customizable: true,
    animations: ["idle", "talking", "thinking", "waving"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "avatar-cute-character",
    name: "Cute Character",
    modelUrl: "/avatars/models/cute-character.glb",
    previewImageUrl: "/avatars/previews/cute-character.png",
    customizable: true,
    animations: ["idle", "talking", "celebrating", "waving"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "avatar-professional-bot",
    name: "Professional Bot",
    modelUrl: "/avatars/models/professional-bot.glb",
    previewImageUrl: "/avatars/previews/professional-bot.png",
    customizable: false,
    animations: ["idle", "talking", "thinking"],
    createdAt: new Date().toISOString(),
  },
];

export class AvatarRegistry {
  private models: Map<string, AvatarModel>;

  constructor() {
    this.models = new Map();
    for (const avatar of builtinAvatars) {
      this.models.set(avatar.id, avatar);
    }
  }

  /** List all available avatar models. */
  list(): AvatarModel[] {
    return [...this.models.values()];
  }

  /** Get a single avatar model by ID. */
  get(id: string): AvatarModel | undefined {
    return this.models.get(id);
  }

  /** Register a custom avatar model. Returns false if ID already exists. */
  register(model: AvatarModel): boolean {
    if (this.models.has(model.id)) {
      return false;
    }
    this.models.set(model.id, model);
    return true;
  }

  /** Remove a custom avatar model. Built-in models cannot be removed. */
  remove(id: string): boolean {
    const isBuiltin = builtinAvatars.some((a) => a.id === id);
    if (isBuiltin) return false;
    return this.models.delete(id);
  }
}
