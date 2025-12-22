# node-red-runtime-observability

Runtime observability plugin for Node-RED that provides real Input/Output visibility per node.

> **⚠️ EXPERIMENTAL**: This is an experimental plugin. Use with caution in production environments.

## What This Plugin Does

- **Captures message samples** at each node's input and output
- **Tracks execution flow** across nodes using message correlation
- **Streams events** via a dedicated WebSocket endpoint
- **Applies strict limits** to prevent memory issues
- **Redacts sensitive data** automatically (passwords, tokens, etc.)

## What This Plugin Does NOT Do

- ❌ Does NOT modify Node-RED core files
- ❌ Does NOT persist data to disk
- ❌ Does NOT capture full payloads (preview only)
- ❌ Does NOT replace the Node-RED debugger
- ❌ Does NOT affect flow execution behavior

## Installation

### Using npm link (Development)

```bash
# Clone the repository
git clone https://github.com/user/node-red-runtime-observability.git
cd node-red-runtime-observability

# Install dependencies
npm install

# Create a global link
npm link

# In your Node-RED user directory (~/.node-red)
cd ~/.node-red
npm link node-red-runtime-observability
```

### Using npm install (Production)

```bash
cd ~/.node-red
npm install node-red-runtime-observability
```

### Using nodesDir setting

Add to your `settings.js`:

```javascript
nodesDir: '/path/to/node-red-runtime-observability'
```

## Configuration

Add the following to your Node-RED `settings.js` file:

```javascript
observability: {
    // REQUIRED: Enable the plugin (disabled by default)
    enabled: true,
    
    // Sampling configuration
    sampling: {
        mode: "first-n",    // "first-n" | "errors-only" | "probabilistic" | "debug-only"
        maxPerNode: 3       // Max samples per node (for first-n mode)
    },
    
    // Data limits
    limits: {
        maxPayloadBytes: 50000,  // 50KB max
        maxDepth: 6,             // Object nesting limit
        maxKeys: 50,             // Max keys per object
        maxArrayItems: 20,       // Max array items
        maxStringLength: 5000    // Max string length
    }
}
```

See `settings.example.js` for a complete configuration example.

## WebSocket API

The plugin exposes a WebSocket endpoint at:

```
ws://<node-red-host>:<port>/observability
```

If you have a custom `httpAdminRoot`, the path will be:

```
ws://<node-red-host>:<port>/<httpAdminRoot>/observability
```

### Events

| Event | Description |
|-------|-------------|
| `connected` | Initial connection confirmation |
| `heartbeat` | Periodic keepalive (every 15s) |
| `execution.start` | New execution context started |
| `execution.end` | Execution context ended |
| `node.input` | Node received a message |
| `node.output` | Node sent a message |
| `node.error` | Node encountered an error |

### Event Payload Format

```json
{
  "type": "node.output",
  "ts": 1703123456789,
  "executionId": "exec-1703123456789-abc123def",
  "nodeId": "node-id-here",
  "flowId": "flow-id-here",
  "data": {
    "ts": 1703123456789,
    "preview": { "payload": "Hello World", "topic": "test" },
    "size": 42,
    "truncated": false,
    "redacted": false
  }
}
```

### Connecting with JavaScript

```javascript
const ws = new WebSocket('ws://localhost:1880/observability');

ws.onopen = () => {
  console.log('Connected to observability');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data.type, data);
};

ws.onclose = () => {
  console.log('Disconnected');
};
```

## Sampling Modes

### first-n (default)
Captures the first N samples for each node, then stops. Good for debugging flow structure without overwhelming with data.

### errors-only
Only captures data when an error occurs. Minimal performance impact.

### probabilistic
Random sampling with configurable probability. Set `sampling.probability` to a value between 0 and 1 (e.g., 0.1 for 10%).

### debug-only
Only captures data for nodes that have a debug flag enabled.

## Security

### Automatic Redaction

The following fields are automatically redacted:
- `password`, `passwd`, `pwd`
- `token`, `accessToken`, `refreshToken`
- `authorization`, `auth`
- `apiKey`, `api_key`
- `secret`, `secretKey`
- `cookie`, `cookies`
- `credential`, `credentials`
- `private`, `privateKey`

### HTTP Headers

Only these headers are preserved:
- `content-type`
- `content-length`
- `status-code`
- `user-agent`
- `accept`
- `accept-encoding`
- `host`
- `origin`

All other headers are redacted.

## Performance Considerations

⚠️ **Warning**: This plugin adds overhead to message processing.

- **Memory**: Keeps up to 20 execution contexts in memory
- **CPU**: Truncation and redaction add processing time
- **Network**: WebSocket broadcasts add network traffic

### Recommendations

1. **Use in development/staging**, not production
2. **Enable only when needed** (disabled by default)
3. **Use `errors-only` mode** in production if required
4. **Monitor memory usage** when enabled
5. **Limit `maxPerNode`** to reduce sample count

## Troubleshooting

### Plugin not loading

Check Node-RED logs for:
```
[observability] Plugin is disabled (set observability.enabled = true in settings.js to enable)
```

### WebSocket not connecting

1. Verify the plugin is enabled and started
2. Check the correct WebSocket path
3. Ensure no firewall blocking the connection

### High memory usage

1. Reduce `sampling.maxPerNode`
2. Switch to `errors-only` mode
3. Reduce `limits.maxPayloadBytes`

## API Reference

### Module Exports

```javascript
const plugin = require('node-red-runtime-observability');

// For testing
plugin.initPlugin(RED);
plugin.disablePlugin();
plugin.getState();
plugin.DEFAULT_CONFIG;
```

## License

Apache-2.0

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting a pull request.

## Changelog

### 0.1.0
- Initial experimental release
- Hook-based message observation
- WebSocket event streaming
- Automatic data truncation and redaction
- Multiple sampling modes

