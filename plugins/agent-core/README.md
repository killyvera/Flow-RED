# Agent Core Node for Redflow

> **⚠️ EXPERIMENTAL**: This is an experimental agent orchestration node. Use with caution in production environments.

## What This Node Does

The **Agent Core Node** is an AI agent orchestrator that implements the **REACT (Reason → Act) strategy** for Redflow. It coordinates agent workflows by routing messages between Model nodes, Tool nodes, and other components in a deterministic and auditable way.

### Key Features

- **REACT Strategy**: Implements Reason → Act loop with one model call and one tool call per iteration
- **Deterministic Execution**: Fully predictable behavior with no hidden loops or state
- **Strict Validation**: Enforces JSON contracts and validates all model responses
- **Observable by Default**: Comprehensive logging and event tracking via AgentEnvelope
- **Edge Validation**: Only allows valid connections between node types
- **Configurable Stop Conditions**: Multiple ways to terminate agent loops

## What This Node Does NOT Do

- ❌ Does NOT call APIs directly
- ❌ Does NOT execute SQL or HTTP requests
- ❌ Does NOT store data persistently
- ❌ Does NOT generate text by itself
- ✅ ONLY orchestrates, validates, and routes messages between nodes

## Architecture

```
Input → Agent Core → Model Node
          ↓
        Tool Nodes
          ↓
        Output
```

The Agent Core node:
1. Receives input data
2. Initializes an AgentEnvelope with observability metadata
3. Enters REACT loop (max iterations configurable)
4. For each iteration:
   - Sends prompt to Model node
   - Validates model response
   - Executes tool if requested (one per iteration)
   - Checks stop conditions
5. Emits final output with complete execution history

## Installation

### Development (npm link)

```bash
# From this directory
npm install
npm link

# In your Node-RED user directory
cd ~/.node-red
npm link node-red-agent-core
```

### Production

```bash
cd ~/.node-red
npm install node-red-agent-core
```

### Using nodesDir (Redflow Development)

Add to your Node-RED settings.js:

```javascript
module.exports = {
  nodesDir: [
    '/path/to/plugins/agent-core'
  ]
}
```

## Configuration

### Required Fields

- **strategy**: Must be "react" (only supported strategy currently)
- **maxIterations**: Maximum iterations before forced termination (1-20)
- **allowedTools**: Array of tool names that can be executed

### Optional Fields

- **stopConditions**: Array of condition objects:
  - `final_answer`: Stop when model returns action="final"
  - `confidence_threshold`: Stop when confidence ≥ threshold
  - `iteration_limit`: Stop at specific iteration
- **debug**: Enable detailed logging (default: false)

### Example Configuration

```json
{
  "strategy": "react",
  "maxIterations": 5,
  "allowedTools": ["search_web", "calculator", "database_query"],
  "stopConditions": [
    { "type": "final_answer" },
    { "type": "confidence_threshold", "value": 0.95 }
  ],
  "debug": true
}
```

## Model Response Format

The Agent Core expects model nodes to return responses in this exact format:

```json
{
  "action": "tool" | "final",
  "tool": "tool_name",
  "input": { /* tool-specific input */ },
  "confidence": 0.85,
  "message": "Optional explanation"
}
```

### Validation Rules

- `action`: Must be "tool" or "final"
- `tool`: Required if action="tool", must be in allowedTools
- `input`: Required if action="tool", must be valid object
- `confidence`: Optional, must be number between 0 and 1

## AgentEnvelope Structure

All data flows through the AgentEnvelope:

```typescript
{
  input: any,                    // Original input
  state: {
    iteration: number,           // Current iteration
    lastAction?: "tool"|"final", // Last action taken
    lastTool?: string,           // Last tool executed
    completed: boolean           // Completion status
  },
  model: {
    lastPrompt?: string,         // Last prompt sent
    lastResponse?: any           // Last model response
  },
  tools: {
    available: string[],         // Available tools
    history: []                  // Tool execution history
  },
  memory?: {},                   // Optional memory
  observability: {
    traceId: string,             // Unique trace ID
    startedAt: string,           // ISO timestamp
    events: []                   // Event timeline
  }
}
```

## Edges (Connections)

### Allowed Connections

- **Input → Agent Core**: Receives task data
- **Agent Core → Model Node**: Sends prompts for reasoning
- **Agent Core → Tool Nodes**: Executes tool actions
- **Agent Core ↔ Memory Node**: Optional memory operations
- **Agent Core → Output**: Emits final results

### Rejected Connections

Any connection not in the allowed list will be rejected with an error.

## Observability

The Agent Core provides comprehensive observability through the envelope:

- **Trace ID**: Unique identifier for each execution
- **Event Timeline**: Every action, tool call, and validation
- **Execution Metrics**: Duration, iteration count, confidence scores
- **Error Tracking**: Structured error logging

## Implementation Status

### ✅ Completed

- [x] Project structure
- [x] JSON schema validation
- [x] AgentEnvelope definition
- [x] Basic stub implementations

### 🚧 In Progress

- [ ] REACT loop implementation
- [ ] Model node integration
- [ ] Tool routing logic
- [ ] Stop condition evaluation

### 📋 Planned

- [ ] Frontend React components
- [ ] Configuration editor UI
- [ ] Runtime debug panel
- [ ] Unit tests
- [ ] Integration tests
- [ ] Documentation examples

## Frontend Integration

See [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) for detailed instructions on integrating this node with the Redflow UI.

## Reference

- Full implementation plan: [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
- JSON Schema: [schemas/agent-core.react.schema.json](./schemas/agent-core.react.schema.json)

## License

Apache-2.0

## Contributing

This is part of the Redflow project. See main repository for contribution guidelines.

