# Noema OpenClaw Extension

OpenClaw extension for communicating via [Noema](https://github.com/ClawControlNoema/Noema) proxy.

## What it does

- Exposes `noema_request`, `noema_poll`, `noema_respond` tools to agents
- Handles authentication with the Noema proxy
- Auto-decodes `§b64:...§` encoded fields before displaying to users

## Configuration

```yaml
# openclaw.yaml
extensions:
  noema:
    proxyUrl: "https://your-noema-proxy.fly.dev"
    token: "${NOEMA_TOKEN}"
    role: requester  # or: provider, both
    subscriptions:   # only needed for provider/both roles
      - agent-alice
```

## Status

🚧 **Under development**

## License

Dual licensed under [MIT](LICENSE) and [Apache 2.0](LICENSE).
