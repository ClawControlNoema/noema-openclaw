/**
 * Type declarations for OpenClaw plugin API.
 * These are simplified types covering what the Noema extension needs.
 */

declare module "openclaw" {
  export interface PluginLogger {
    debug?: (message: string) => void;
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
  }

  export interface OpenClawPluginToolOptions {
    name?: string;
    names?: string[];
    optional?: boolean;
  }

  export interface PluginHookMessageContext {
    channelId: string;
    accountId?: string;
    conversationId?: string;
  }

  export interface PluginHookMessageSendingEvent {
    to: string;
    content: string;
    metadata?: Record<string, unknown>;
  }

  export interface PluginHookMessageSendingResult {
    content?: string;
    cancel?: boolean;
  }

  export interface OpenClawPluginApi {
    id: string;
    name: string;
    version?: string;
    description?: string;
    source: string;
    config: Record<string, unknown>;
    pluginConfig?: Record<string, unknown>;
    logger: PluginLogger;

    registerTool: (
      tool: unknown,
      opts?: OpenClawPluginToolOptions
    ) => void;

    on: <K extends string>(
      hookName: K,
      handler: (
        event: PluginHookMessageSendingEvent,
        ctx: PluginHookMessageContext
      ) => PluginHookMessageSendingResult | void,
      opts?: { priority?: number }
    ) => void;
  }
}
