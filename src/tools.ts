/**
 * Noema Tools for OpenClaw Agents
 *
 * Three tools enabling agents to communicate via Noema proxy:
 * - noema_request: Request data with a schema (requester role)
 * - noema_poll: Poll for pending requests (provider role)
 * - noema_respond: Respond to a request (provider role)
 */

import { NoemaClient } from "./client.js";
import type { NoemaConfig, NoemaRole } from "./types.js";

// TypeBox-style schema builder (compatible with OpenClaw's tool system)
const Type = {
  Object: (properties: Record<string, unknown>, opts?: { description?: string }) => ({
    type: "object",
    properties,
    ...opts,
  }),
  String: (opts?: { description?: string }) => ({ type: "string", ...opts }),
  Number: (opts?: { description?: string }) => ({ type: "number", ...opts }),
  Optional: (schema: unknown) => schema, // Optional handled by required array
  Unknown: (opts?: { description?: string }) => ({ ...opts }), // Any type
};

/**
 * Create the noema_request tool.
 * Used by requesters to request data from provider agents.
 */
export function createNoemaRequestTool(client: NoemaClient, role: NoemaRole) {
  return {
    name: "noema_request",
    description:
      "Request data from another agent via Noema proxy. Provide a JSON Schema defining the expected response structure. " +
      "The proxy validates responses against your schema and encodes unstructured fields (marked with unstructured: true) " +
      "to prevent prompt injection. Returns the validated, encoded response.",
    parameters: Type.Object({
      schema: Type.Object(
        {},
        { description: "JSON Schema defining expected response structure. Use 'unstructured: true' on string fields that may contain untrusted content." }
      ),
      input: Type.Object(
        {},
        { description: "Input parameters to pass to the provider agent" }
      ),
      timeout_ms: Type.Optional(
        Type.Number({ description: "Timeout in milliseconds (default: 30000)" })
      ),
    }),

    async execute(_id: string, params: Record<string, unknown>) {
      // Role check
      if (role !== "requester" && role !== "both") {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "noema_request requires 'requester' or 'both' role",
                configured_role: role,
              }),
            },
          ],
        };
      }

      const schema = (params.schema ?? {}) as Record<string, unknown>;
      const input = (params.input ?? {}) as Record<string, unknown>;
      const timeoutMs =
        typeof params.timeout_ms === "number" ? params.timeout_ms : 30000;

      const result = await client.request(schema, input, timeoutMs);

      if (result.success) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                request_id: result.request_id,
                output: result.output,
              }, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                request_id: result.request_id,
                error_code: result.error_code,
                error_details: result.error_details,
              }, null, 2),
            },
          ],
        };
      }
    },
  };
}

/**
 * Create the noema_poll tool.
 * Used by providers to check for pending requests.
 */
export function createNoemaPollTool(client: NoemaClient, role: NoemaRole) {
  return {
    name: "noema_poll",
    description:
      "Poll for pending requests from other agents (provider role). " +
      "Returns a list of requests awaiting your response, filtered by your subscription list. " +
      "Each request includes the requester's schema and input parameters.",
    parameters: Type.Object({}),

    async execute(_id: string, _params: Record<string, unknown>) {
      // Role check
      if (role !== "provider" && role !== "both") {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "noema_poll requires 'provider' or 'both' role",
                configured_role: role,
              }),
            },
          ],
        };
      }

      const result = await client.poll();

      if (result.success) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                pending_count: result.requests.length,
                requests: result.requests,
              }, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: result.error,
              }, null, 2),
            },
          ],
        };
      }
    },
  };
}

/**
 * Create the noema_respond tool.
 * Used by providers to respond to pending requests.
 */
export function createNoemaRespondTool(client: NoemaClient, role: NoemaRole) {
  return {
    name: "noema_respond",
    description:
      "Respond to a pending request (provider role). " +
      "Your response must match the requester's schema. " +
      "The proxy validates your response and encodes unstructured fields before delivering.",
    parameters: Type.Object({
      request_id: Type.String({
        description: "ID of the request to respond to (from noema_poll)",
      }),
      output: Type.Object(
        {},
        { description: "Response data matching the request's schema" }
      ),
    }),

    async execute(_id: string, params: Record<string, unknown>) {
      // Role check
      if (role !== "provider" && role !== "both") {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "noema_respond requires 'provider' or 'both' role",
                configured_role: role,
              }),
            },
          ],
        };
      }

      const requestId = params.request_id as string;
      const output = (params.output ?? {}) as Record<string, unknown>;

      if (!requestId) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "request_id is required",
              }),
            },
          ],
        };
      }

      const result = await client.respond(requestId, output);

      if (result.success) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: `Response sent for request ${requestId}`,
              }),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: result.error,
              }),
            },
          ],
        };
      }
    },
  };
}

/**
 * Create all Noema tools based on configuration.
 */
export function createNoemaTools(config: NoemaConfig) {
  const client = new NoemaClient(config);
  const tools = [];

  // Requester tools
  if (config.role === "requester" || config.role === "both") {
    tools.push(createNoemaRequestTool(client, config.role));
  }

  // Provider tools
  if (config.role === "provider" || config.role === "both") {
    tools.push(createNoemaPollTool(client, config.role));
    tools.push(createNoemaRespondTool(client, config.role));
  }

  return tools;
}
