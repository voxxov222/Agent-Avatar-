/**
 * Runtime singleton for the avatar-agents extension.
 * Stores a reference to the Clawdbot plugin runtime so other modules
 * can access logging and config without circular imports.
 */

import type { PluginRuntime } from "clawdbot/plugin-sdk";

let _runtime: PluginRuntime | undefined;

export function setAvatarAgentsRuntime(runtime: PluginRuntime): void {
  _runtime = runtime;
}

export function getAvatarAgentsRuntime(): PluginRuntime | undefined {
  return _runtime;
}
