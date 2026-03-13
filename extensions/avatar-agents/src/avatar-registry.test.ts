import { describe, expect, it } from "vitest";

import { AvatarRegistry } from "./avatar-registry.js";

describe("AvatarRegistry", () => {
  it("lists built-in avatars", () => {
    const registry = new AvatarRegistry();
    const avatars = registry.list();
    expect(avatars.length).toBe(3);
    expect(avatars.map((a) => a.id)).toContain("avatar-friendly-robot");
    expect(avatars.map((a) => a.id)).toContain("avatar-cute-character");
    expect(avatars.map((a) => a.id)).toContain("avatar-professional-bot");
  });

  it("gets a built-in avatar by ID", () => {
    const registry = new AvatarRegistry();
    const avatar = registry.get("avatar-friendly-robot");
    expect(avatar).toBeDefined();
    expect(avatar!.name).toBe("Friendly Robot");
    expect(avatar!.customizable).toBe(true);
    expect(avatar!.animations).toContain("idle");
    expect(avatar!.animations).toContain("talking");
  });

  it("returns undefined for unknown ID", () => {
    const registry = new AvatarRegistry();
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("registers a custom avatar", () => {
    const registry = new AvatarRegistry();
    const custom = {
      id: "custom-avatar-1",
      name: "Custom Avatar",
      modelUrl: "/models/custom.glb",
      previewImageUrl: "/previews/custom.png",
      customizable: false,
      animations: ["idle" as const, "talking" as const],
      createdAt: new Date().toISOString(),
    };
    expect(registry.register(custom)).toBe(true);
    expect(registry.get("custom-avatar-1")).toEqual(custom);
    expect(registry.list().length).toBe(4);
  });

  it("rejects duplicate registration", () => {
    const registry = new AvatarRegistry();
    const custom = {
      id: "avatar-friendly-robot",
      name: "Duplicate",
      modelUrl: "/models/dup.glb",
      previewImageUrl: "/previews/dup.png",
      customizable: false,
      animations: ["idle" as const],
      createdAt: new Date().toISOString(),
    };
    expect(registry.register(custom)).toBe(false);
  });

  it("removes a custom avatar but not built-in ones", () => {
    const registry = new AvatarRegistry();
    // Cannot remove built-in.
    expect(registry.remove("avatar-friendly-robot")).toBe(false);
    expect(registry.list().length).toBe(3);

    // Can remove custom.
    registry.register({
      id: "removable",
      name: "Removable",
      modelUrl: "/models/removable.glb",
      previewImageUrl: "/previews/removable.png",
      customizable: false,
      animations: ["idle" as const],
      createdAt: new Date().toISOString(),
    });
    expect(registry.list().length).toBe(4);
    expect(registry.remove("removable")).toBe(true);
    expect(registry.list().length).toBe(3);
  });
});
