# Agent Core Node (REACT Strategy) - Implementation Plan

You are a senior TypeScript / React / Node-RED systems engineer.

Your task is to implement the **Agent Core Node (REACT strategy)** for a project called **Redflow**, a modern React Flow–based UI and runtime layer for Node-RED.

This node is the **orchestrator of an agent system**, NOT an LLM, NOT a tool, NOT a memory store.

## HIGH-LEVEL GOAL

Implement an **Agent Core Node** that:
- Orchestrates a REACT (Reason → Act) loop
- Calls exactly ONE model action per iteration
- Executes at most ONE tool per iteration
- Is fully deterministic, auditable, and observable
- Uses strict JSON contracts
- Is compatible with Node-RED runtime + Redflow UI

## ABSOLUTE RULES

- The Agent Core must NEVER:
  - Call APIs directly
  - Execute SQL or HTTP
  - Store data persistently
  - Generate text by itself
- The Agent Core ONLY:
  - Orchestrates
  - Validates
  - Routes messages between nodes

- One action per iteration
- No hidden loops
- No chain-of-thought exposed
- All communication uses explicit schemas

## STRATEGY

Implement ONLY:
- strategy = "react"

No router, no plan-execute yet.

## NODE CONFIG SCHEMA

Create `agent-core.react.schema.json`:

```json
{
  "type": "object",
  "required": ["strategy", "maxIterations", "allowedTools"],
  "properties": {
    "strategy": {
      "const": "react"
    },
    "maxIterations": {
      "type": "integer",
      "minimum": 1,
      "maximum": 20,
      "default": 5
    },
    "allowedTools": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    },
    "stopConditions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type"],
        "properties": {
          "type": {
            "enum": [
              "final_answer",
              "confidence_threshold",
              "iteration_limit"
            ]
          },
          "value": {}
        }
      },
      "default": []
    },
    "debug": {
      "type": "boolean",
      "default": false
    }
  }
}
```

## AGENT ENVELOPE (RUNTIME CONTRACT)

All internal message passing MUST use this envelope:

```typescript
interface AgentEnvelope {
  input: any
  state: {
    iteration: number
    lastAction?: "tool" | "final"
    lastTool?: string
    completed: boolean
  }
  model?: {
    lastPrompt?: string
    lastResponse?: any
  }
  tools: {
    available: string[]
    history: any[]
  }
  memory?: Record<string, any>
  observability: {
    traceId: string
    startedAt: string
    events: Array<{
      iteration: number
      action: string
      tool?: string
      durationMs?: number
      confidence?: number
    }>
  }
}
```

## MODEL PROMPT (INJECTED BY AGENT CORE)

The Agent Core must inject this prompt into the Model Node:

```text
You are an execution agent.

You must decide ONE action per iteration.

Available tools:
{{tools}}

Rules:
- Use only the provided tools
- If you have enough information, return a FINAL action
- Always respond in valid JSON
- Do NOT explain your reasoning

Output format:
{
  "action": "tool" | "final",
  "tool": "tool_name_if_any",
  "input": {},
  "confidence": number,
  "message": "optional"
}
```

## MODEL RESPONSE VALIDATION

The Agent Core must strictly validate:

- Valid JSON
- `action` must be "tool" or "final"
- If `action == "tool"`:
  - `tool` must be in `allowedTools`
  - `input` must match tool input schema
  - `confidence` must be a number between 0 and 1

Invalid responses must:
- Stop execution
- Emit a structured error
- Be logged in observability

## EXECUTION LOOP (REACT)

Implement this exact logic:

```typescript
initializeEnvelope()

for (iteration = 1; iteration <= maxIterations; iteration++) {
  envelope.state.iteration = iteration

  const modelResponse = callModel(envelope)

  validateModelResponse(modelResponse)

  if (modelResponse.action === "final") {
    envelope.state.completed = true
    break
  }

  if (modelResponse.action === "tool") {
    assertToolAllowed(modelResponse.tool)
    const toolResult = executeTool(modelResponse.tool, modelResponse.input)
    updateEnvelopeWithToolResult(toolResult)
  }

  if (stopConditionReached(envelope)) {
    break
  }
}

emitFinalOutput(envelope)
```

## EDGES (STRICT)

Allowed edges for Agent Core Node:

- `data`: Input → Agent Core
- `model`: Agent Core → Model Node
- `tool`: Agent Core → Tool Nodes
- `memory`: Agent Core ↔ Memory Node (optional)
- `data`: Agent Core → Output Node

Any invalid connection must be rejected.

## UI REQUIREMENTS (REDFLOW)

Implement these configuration tabs:

### General
- Strategy (locked to react)
- Max Iterations
- Debug toggle

### Tools
- List of connected tool nodes
- Warning if a tool has no JSON schema

### Runtime / Debug
- Iteration timeline
- Last action
- Confidence per iteration

### Errors
- Invalid JSON
- Tool not allowed
- Iteration overflow

## QUALITY BAR

- TypeScript strict
- No magic strings
- Deterministic behavior
- Fully testable
- Observable by default

This node will be the foundation for all future agents in Redflow.

**Do NOT add extra features.**
**Do NOT implement other strategies.**

