/**
 * Noema OpenClaw Extension - Type Definitions
 */

// JSON Schema type (simplified for our use case)
export type JSONSchema = Record<string, unknown>;

// =============================================================================
// Configuration
// =============================================================================

export type NoemaRole = "requester" | "provider" | "both";

export interface NoemaConfig {
  proxyUrl: string;
  token: string;
  role: NoemaRole;
  subscriptions?: string[];
}

// =============================================================================
// API Messages - Requester → Proxy
// =============================================================================

export interface NoemaRequestPayload {
  type: "request";
  request_id: string;
  schema: JSONSchema;
  input: Record<string, unknown>;
  timeout_ms?: number;
}

// =============================================================================
// API Messages - Provider → Proxy
// =============================================================================

export interface NoemaPollPayload {
  type: "poll";
}

export interface NoemaResponsePayload {
  type: "response";
  request_id: string;
  output: Record<string, unknown>;
}

// =============================================================================
// API Messages - Proxy → Agent
// =============================================================================

export interface PendingRequest {
  request_id: string;
  from: string;
  schema: JSONSchema;
  input: Record<string, unknown>;
  posted_at: string;
  timeout_at: string;
}

export interface NoemaPollResponse {
  type: "poll_response";
  requests: PendingRequest[];
}

export interface NoemaResult {
  type: "result";
  request_id: string;
  status: "success" | "error";
  output?: Record<string, unknown>;
  error_code?: NoemaErrorCode;
  error_details?: Record<string, unknown>;
}

// =============================================================================
// Error Codes
// =============================================================================

export type NoemaErrorCode =
  | "VALIDATION_FAILED"
  | "TIMEOUT"
  | "PROVIDER_ERROR"
  | "NO_PROVIDERS"
  | "UNAUTHORIZED"
  | "REQUEST_NOT_FOUND"
  | "INTERNAL_ERROR";

// =============================================================================
// Client Return Types
// =============================================================================

export interface NoemaRequestResult {
  success: boolean;
  request_id: string;
  output?: Record<string, unknown>;
  error_code?: NoemaErrorCode;
  error_details?: Record<string, unknown>;
}

export interface NoemaPollResult {
  success: boolean;
  requests: PendingRequest[];
  error?: string;
}

export interface NoemaRespondResult {
  success: boolean;
  error?: string;
}
