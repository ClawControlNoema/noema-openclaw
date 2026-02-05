/**
 * Noema OpenClaw Extension
 *
 * Integrates Noema proxy communication into OpenClaw agents.
 *
 * Features:
 * - Tools for requesting, polling, and responding via Noema proxy
 * - Auto-decodes §b64:...§ tokens before messages are sent to users
 */

import type { OpenClawPluginApi } from "openclaw";
import { decodeNoema, hasNoemaTokens } from "./decode.js";
import { createNoemaTools } from "./tools.js";
import type { NoemaConfig, NoemaRole } from "./types.js";

/**
 * Validate and extract the plugin configuration.
 */
function getConfig(api: OpenClawPluginApi): NoemaConfig | null {
  const cfg = api.pluginConfig as Partial<NoemaConfig> | undefined;

  if (!cfg) {
    api.logger.warn("Noema: No configuration provided");
    return null;
  }

  if (!cfg.proxyUrl) {
    api.logger.error("Noema: proxyUrl is required");
    return null;
  }

  if (!cfg.token) {
    api.logger.error("Noema: token is required");
    return null;
  }

  if (!cfg.role || !["requester", "provider", "both"].includes(cfg.role)) {
    api.logger.error("Noema: role must be 'requester', 'provider', or 'both'");
    return null;
  }

  // For provider roles, subscriptions are optional but recommended
  if ((cfg.role === "provider" || cfg.role === "both") && !cfg.subscriptions) {
    api.logger.info(
      "Noema: No subscriptions configured. Provider will see all requests (if proxy allows)."
    );
  }

  return {
    proxyUrl: cfg.proxyUrl,
    token: cfg.token,
    role: cfg.role as NoemaRole,
    subscriptions: cfg.subscriptions,
  };
}

/**
 * Plugin registration function.
 */
export default function register(api: OpenClawPluginApi) {
  const config = getConfig(api);

  if (!config) {
    api.logger.warn("Noema: Extension not activated due to missing/invalid configuration");
    return;
  }

  api.logger.info(`Noema: Initializing with role '${config.role}'`);

  // Register tools based on role
  const tools = createNoemaTools(config);
  for (const tool of tools) {
    api.registerTool(tool, { optional: true });
    api.logger.info(`Noema: Registered tool '${tool.name}'`);
  }

  // Register output decoder hook
  // This runs before messages are sent to users, decoding any §b64:...§ tokens
  api.on("message_sending", (event, _ctx) => {
    if (!event.content || typeof event.content !== "string") {
      return;
    }

    if (!hasNoemaTokens(event.content)) {
      return; // No tokens to decode, skip
    }

    const decoded = decodeNoema(event.content);
    if (api.logger.debug) {
      api.logger.debug(`Noema: Decoded ${event.content.length - decoded.length} chars of encoded tokens`);
    }

    return { content: decoded };
  });

  api.logger.info("Noema: Extension activated successfully");
}

// Re-export types for consumers
export * from "./types.js";
export { decodeNoema, hasNoemaTokens } from "./decode.js";
export { NoemaClient } from "./client.js";
