# Noema OpenClaw Extension — Build Task

## Context

You are building the **Noema OpenClaw Extension** — integrates Noema proxy communication into OpenClaw agents.

**Full spec:** https://github.com/ClawControlNoema/Noema (see PROTOCOL.md, IMPLEMENTATION.md)

**OpenClaw plugin API reference:** /home/clawdbot/workspace/openclaw-source/src/plugins/types.ts

## Your Task

Build an OpenClaw extension that:
1. Exposes tools for agents to communicate via Noema proxy
2. Auto-decodes `§b64:...§` tokens before messages are sent to users

### Extension Structure

```
src/
├── index.ts          # Extension entry point (register function)
├── client.ts         # HTTP client for Noema proxy
├── tools.ts          # Tool definitions
├── decode.ts         # Output decoder
└── types.ts          # TypeScript interfaces
openclaw.plugin.json  # Plugin manifest
package.json
tsconfig.json
```

### Plugin Manifest

```json
{
  "id": "noema",
  "name": "Noema",
  "description": "Schema-enforcing communication between AI agents via Noema proxy",
  "configSchema": {
    "type": "object",
    "properties": {
      "proxyUrl": { "type": "string", "description": "Noema proxy URL" },
      "token": { "type": "string", "description": "Agent authentication token" },
      "role": { "type": "string", "enum": ["requester", "provider", "both"] },
      "subscriptions": { 
        "type": "array", 
        "items": { "type": "string" },
        "description": "Agent IDs to subscribe to (provider role only)"
      }
    },
    "required": ["proxyUrl", "token", "role"]
  }
}
```

### Tools to Implement

#### noema_request
```typescript
{
  name: "noema_request",
  description: "Request data from another agent via Noema proxy. Returns schema-validated, encoded response.",
  parameters: {
    schema: { type: "object", description: "JSON Schema defining expected response structure" },
    input: { type: "object", description: "Input parameters for the provider agent" },
    timeout_ms: { type: "number", description: "Timeout in milliseconds (default 30000)" }
  }
}
```

#### noema_poll
```typescript
{
  name: "noema_poll",
  description: "Poll for pending requests (provider role). Returns list of requests awaiting response.",
  parameters: {}
}
```

#### noema_respond
```typescript
{
  name: "noema_respond",
  description: "Respond to a pending request (provider role). Response must match the request's schema.",
  parameters: {
    request_id: { type: "string", description: "ID of the request to respond to" },
    output: { type: "object", description: "Response data matching the request schema" }
  }
}
```

### Output Decoder

Use the `message_sending` hook to decode before output:

```typescript
api.on('message_sending', (event, ctx) => {
  const decoded = decodeNoema(event.content);
  return { content: decoded };
});

function decodeNoema(text: string): string {
  return text.replace(
    /§b64:([A-Za-z0-9+/=]+)§/g,
    (_, encoded) => Buffer.from(encoded, 'base64').toString('utf-8')
  );
}
```

### HTTP Client

The client MUST only talk to the configured `proxyUrl`. The agent cannot control the destination URL.

```typescript
class NoemaClient {
  constructor(private proxyUrl: string, private token: string) {}
  
  async request(schema: object, input: object, timeoutMs?: number): Promise<Result>
  async poll(): Promise<PendingRequest[]>
  async respond(requestId: string, output: object): Promise<void>
}
```

### User Configuration

```yaml
# openclaw.yaml
extensions:
  noema:
    proxyUrl: "https://noema-proxy.fly.dev"
    token: "${NOEMA_TOKEN}"
    role: requester
```

### Dependencies

- Standard Node.js fetch (no external HTTP libs needed)

### Deliverables

1. Working extension with all 3 tools
2. Output decoder hook
3. Example config
4. README with setup instructions

### Git

- Repo: ClawControlNoema/noema-openclaw (already cloned at /home/clawdbot/workspace/noema-openclaw)
- Commit with "ClawControlDevelopmentBot" label
- Push when you have working milestones

### Reference

Look at /home/clawdbot/workspace/openclaw-source/extensions/llm-task/ for a working example of:
- Tool registration
- Plugin manifest
- Config schema

Good luck! Ask if you need clarification.
