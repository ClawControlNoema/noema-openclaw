/**
 * Noema HTTP Client
 *
 * Communicates with the configured Noema proxy.
 * SECURITY: Only talks to the configured proxyUrl - agent cannot control destination.
 */

import type {
  JSONSchema,
  NoemaConfig,
  NoemaErrorCode,
  NoemaPollResponse,
  NoemaPollResult,
  NoemaRequestPayload,
  NoemaRequestResult,
  NoemaRespondResult,
  NoemaResponsePayload,
  NoemaResult,
} from "./types.js";

function generateRequestId(): string {
  // Simple unique ID: timestamp + random
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `req-${timestamp}-${random}`;
}

export class NoemaClient {
  private readonly proxyUrl: string;
  private readonly token: string;

  constructor(config: NoemaConfig) {
    // Normalize URL (remove trailing slash)
    this.proxyUrl = config.proxyUrl.replace(/\/+$/, "");
    this.token = config.token;
  }

  /**
   * Post a request to the proxy with a schema defining expected response.
   * Blocks until response is received or timeout occurs.
   */
  async request(
    schema: JSONSchema,
    input: Record<string, unknown>,
    timeoutMs = 30000
  ): Promise<NoemaRequestResult> {
    const requestId = generateRequestId();

    const payload: NoemaRequestPayload = {
      type: "request",
      request_id: requestId,
      schema,
      input,
      timeout_ms: timeoutMs,
    };

    // POST the request
    const postResponse = await this.fetch("/request", payload);

    if (!postResponse.ok) {
      const error = await this.parseError(postResponse);
      return {
        success: false,
        request_id: requestId,
        error_code: error.code as NoemaErrorCode,
        error_details: error.details,
      };
    }

    // Poll for result (with exponential backoff)
    const startTime = Date.now();
    let pollInterval = 500; // Start with 500ms
    const maxPollInterval = 5000; // Cap at 5s

    while (Date.now() - startTime < timeoutMs) {
      // Wait before polling
      await this.sleep(pollInterval);

      // Check for result
      const resultResponse = await this.fetch(`/result/${requestId}`, null, "GET");

      if (resultResponse.ok) {
        const result = (await resultResponse.json()) as NoemaResult;

        if (result.status === "success") {
          return {
            success: true,
            request_id: requestId,
            output: result.output,
          };
        } else {
          return {
            success: false,
            request_id: requestId,
            error_code: result.error_code,
            error_details: result.error_details,
          };
        }
      } else if (resultResponse.status === 404) {
        // Result not ready yet, continue polling
        pollInterval = Math.min(pollInterval * 1.5, maxPollInterval);
        continue;
      } else {
        // Unexpected error
        const error = await this.parseError(resultResponse);
        return {
          success: false,
          request_id: requestId,
          error_code: error.code as NoemaErrorCode,
          error_details: error.details,
        };
      }
    }

    // Timeout
    return {
      success: false,
      request_id: requestId,
      error_code: "TIMEOUT",
      error_details: { message: `Request timed out after ${timeoutMs}ms` },
    };
  }

  /**
   * Poll for pending requests (provider role).
   */
  async poll(): Promise<NoemaPollResult> {
    const response = await this.fetch("/poll", { type: "poll" });

    if (!response.ok) {
      const error = await this.parseError(response);
      return {
        success: false,
        requests: [],
        error: String(error.details?.message ?? `HTTP ${response.status}`),
      };
    }

    const data = (await response.json()) as NoemaPollResponse;
    return {
      success: true,
      requests: data.requests,
    };
  }

  /**
   * Respond to a pending request (provider role).
   */
  async respond(
    requestId: string,
    output: Record<string, unknown>
  ): Promise<NoemaRespondResult> {
    const payload: NoemaResponsePayload = {
      type: "response",
      request_id: requestId,
      output,
    };

    const response = await this.fetch("/response", payload);

    if (!response.ok) {
      const error = await this.parseError(response);
      return {
        success: false,
        error: String(error.details?.message ?? `HTTP ${response.status}`),
      };
    }

    return { success: true };
  }

  // ===========================================================================
  // Private helpers
  // ===========================================================================

  private async fetch(
    path: string,
    body: unknown,
    method: "GET" | "POST" = "POST"
  ): Promise<Response> {
    const url = `${this.proxyUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (method === "POST" && body !== null) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    return fetch(url, options);
  }

  private async parseError(
    response: Response
  ): Promise<{ code: string; details: Record<string, unknown> }> {
    try {
      const data = (await response.json()) as Record<string, unknown>;
      return {
        code: (data.error_code as string) ?? "INTERNAL_ERROR",
        details: (data.error_details as Record<string, unknown>) ?? {
          message: (data.message as string) ?? (data.error as string) ?? "Unknown error",
        },
      };
    } catch {
      return {
        code: "INTERNAL_ERROR",
        details: { message: `HTTP ${response.status}` },
      };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
