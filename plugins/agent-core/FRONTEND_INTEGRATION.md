# Frontend Integration Guide - Agent Core Node

This guide explains how to integrate the Agent Core node with the Redflow UI (React Flow based frontend).

## Overview

The Agent Core node needs custom React components for:
1. **Node Visualization** - How it appears on the canvas
2. **Configuration Editor** - UI for editing node properties
3. **Runtime Display** - Real-time execution status

## Integration Steps

### 1. Register Node Component

#### File: `src/canvas/nodes/AgentCoreNode.tsx`

Create a custom React component for the Agent Core node:

```typescript
/**
 * AgentCoreNode.tsx - Visual representation of Agent Core node
 */

import { BaseNode, BaseNodeData } from './BaseNode'
import { NodeProps } from 'reactflow'
import { Brain, Activity, AlertCircle } from 'lucide-react'

export interface AgentCoreNodeData extends BaseNodeData {
  strategy?: 'react'
  maxIterations?: number
  allowedTools?: string[]
  currentIteration?: number
  status?: 'idle' | 'running' | 'completed' | 'error'
}

export function AgentCoreNode(props: NodeProps<AgentCoreNodeData>) {
  const { data } = props
  const status = data.status || 'idle'
  const iteration = data.currentIteration || 0
  const maxIterations = data.maxIterations || 5

  // Status indicator
  const StatusIcon = status === 'error' ? AlertCircle : 
                     status === 'running' ? Activity : 
                     Brain

  return (
    <BaseNode
      {...props}
      data={{
        ...data,
        icon: 'Brain',
        // Badge showing iteration progress
        badge: status === 'running' ? `${iteration}/${maxIterations}` : undefined,
        // Custom status indicator
        statusIndicator: (
          <StatusIcon 
            className="w-3 h-3"
            style={{ 
              color: status === 'error' ? 'var(--color-status-error)' :
                     status === 'running' ? 'var(--color-accent-primary)' :
                     'var(--color-text-tertiary)'
            }}
          />
        )
      }}
    />
  )
}
```

#### Register in `src/canvas/nodes/nodeFactory.ts`

```typescript
import { AgentCoreNode } from './AgentCoreNode'

const nodeTypeMap: Record<string, React.ComponentType<any>> = {
  'inject': InjectNode,
  'debug': DebugNode,
  'group': GroupNode,
  'agent-core': AgentCoreNode,  // ADD THIS
}
```

### 2. Create Configuration Editor

#### File: `src/components/nodes/agent-core/AgentCoreConfig.tsx`

```typescript
/**
 * AgentCoreConfig.tsx - Configuration editor for Agent Core node
 */

import { TabbedNodeEditor } from '../../editors/TabbedNodeEditor'
import { GeneralTab } from './tabs/GeneralTab'
import { ToolsTab } from './tabs/ToolsTab'
import { RuntimeTab } from './tabs/RuntimeTab'

export interface AgentCoreConfigProps {
  nodeData: any
  onChange: (data: any) => void
}

export function AgentCoreConfig({ nodeData, onChange }: AgentCoreConfigProps) {
  const tabs = [
    {
      id: 'general',
      label: 'General',
      icon: 'Settings',
      content: <GeneralTab nodeData={nodeData} onChange={onChange} />
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: 'Wrench',
      content: <ToolsTab nodeData={nodeData} onChange={onChange} />
    },
    {
      id: 'runtime',
      label: 'Runtime',
      icon: 'Activity',
      content: <RuntimeTab nodeData={nodeData} onChange={onChange} />
    }
  ]

  return (
    <TabbedNodeEditor
      tabs={tabs}
      title="Agent Core Configuration"
      description="Configure REACT strategy orchestration"
    />
  )
}
```

#### Register in `src/components/CustomEditorRenderer.tsx`

```typescript
import { AgentCoreConfig } from './nodes/agent-core/AgentCoreConfig'

const CUSTOM_EDITORS: Record<string, React.ComponentType<any>> = {
  'http request': HttpRequestConfig,
  'agent-core': AgentCoreConfig,  // ADD THIS
}
```

### 3. Configuration Tabs

#### File: `src/components/nodes/agent-core/tabs/GeneralTab.tsx`

```typescript
/**
 * GeneralTab.tsx - General configuration for Agent Core
 */

import { SelectField } from '../../../fields/SelectField'
import { NumberField } from '../../../fields/NumberField'
import { BooleanField } from '../../../fields/BooleanField'

export function GeneralTab({ nodeData, onChange }: any) {
  return (
    <div className="space-y-4 p-4">
      <SelectField
        id="strategy"
        label="Strategy"
        value={nodeData.strategy || 'react'}
        onChange={(value) => onChange({ ...nodeData, strategy: value })}
        options={[
          { value: 'react', label: 'REACT (Reason → Act)' }
        ]}
        disabled={true}
        description="Orchestration strategy (only REACT supported)"
      />

      <NumberField
        id="maxIterations"
        label="Max Iterations"
        value={nodeData.maxIterations || 5}
        onChange={(value) => onChange({ ...nodeData, maxIterations: value })}
        min={1}
        max={20}
        description="Maximum iterations before forced termination"
      />

      <BooleanField
        id="debug"
        label="Debug Mode"
        value={nodeData.debug || false}
        onChange={(value) => onChange({ ...nodeData, debug: value })}
        description="Enable detailed logging for observability"
      />
    </div>
  )
}
```

#### File: `src/components/nodes/agent-core/tabs/ToolsTab.tsx`

```typescript
/**
 * ToolsTab.tsx - Tool configuration for Agent Core
 */

import { useState } from 'react'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'

export function ToolsTab({ nodeData, onChange }: any) {
  const allowedTools = nodeData.allowedTools || []

  const handleAddTool = () => {
    const newTools = [...allowedTools, '']
    onChange({ ...nodeData, allowedTools: newTools })
  }

  const handleRemoveTool = (index: number) => {
    const newTools = allowedTools.filter((_: any, i: number) => i !== index)
    onChange({ ...nodeData, allowedTools: newTools })
  }

  const handleUpdateTool = (index: number, value: string) => {
    const newTools = [...allowedTools]
    newTools[index] = value
    onChange({ ...nodeData, allowedTools: newTools })
  }

  return (
    <div className="space-y-4 p-4">
      <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Specify which tools the agent is allowed to use. Tool names must match
        the types of connected tool nodes.
      </div>

      {allowedTools.length === 0 && (
        <div 
          className="p-3 rounded text-sm border flex items-start gap-2"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-status-warning)',
            color: 'var(--color-status-warning)'
          }}
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>No tools configured. Add at least one tool.</span>
        </div>
      )}

      <div className="space-y-2">
        {allowedTools.map((tool: string, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={tool}
              onChange={(e) => handleUpdateTool(index, e.target.value)}
              placeholder="Tool name"
              className="flex-1 px-3 py-2 rounded text-sm"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-node-border)',
                borderWidth: '1px',
                borderStyle: 'solid',
                color: 'var(--color-text-primary)'
              }}
            />
            <button
              onClick={() => handleRemoveTool(index)}
              className="p-2 rounded"
              style={{ color: 'var(--color-status-error)' }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleAddTool}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded border w-full justify-center"
        style={{
          color: 'var(--color-accent-primary)',
          borderColor: 'var(--color-accent-primary)',
          borderWidth: '1px'
        }}
      >
        <Plus className="w-4 h-4" />
        Add Tool
      </button>
    </div>
  )
}
```

#### File: `src/components/nodes/agent-core/tabs/RuntimeTab.tsx`

```typescript
/**
 * RuntimeTab.tsx - Runtime status display for Agent Core
 */

export function RuntimeTab({ nodeData }: any) {
  const envelope = nodeData.envelope || {}
  const events = envelope.observability?.events || []

  return (
    <div className="space-y-4 p-4">
      <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Real-time execution status and observability data.
      </div>

      {events.length === 0 && (
        <div 
          className="p-4 rounded text-sm text-center"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            color: 'var(--color-text-tertiary)'
          }}
        >
          No execution data yet. Run the flow to see agent activity.
        </div>
      )}

      {events.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            Execution Timeline
          </h4>
          <div className="space-y-1">
            {events.map((event: any, index: number) => (
              <div 
                key={index}
                className="p-2 rounded text-xs border-l-2"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderLeftColor: event.action === 'tool' 
                    ? 'var(--color-accent-primary)' 
                    : 'var(--color-status-success)'
                }}
              >
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-text-primary)' }}>
                    Iteration {event.iteration}: {event.action}
                  </span>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>
                    {event.durationMs}ms
                  </span>
                </div>
                {event.tool && (
                  <div style={{ color: 'var(--color-text-secondary)' }}>
                    Tool: {event.tool}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

### 4. Default Values

#### File: `src/utils/nodeDefaults.ts`

Add default configuration for agent-core:

```typescript
const NODE_DEFAULTS: Record<string, any> = {
  // ... existing defaults ...
  
  'agent-core': {
    strategy: 'react',
    maxIterations: 5,
    allowedTools: [],
    stopConditions: [],
    debug: false
  }
}
```

### 5. Node Icon

#### File: `src/utils/nodeIcons.ts`

Map agent-core to an appropriate icon:

```typescript
const NODE_ICON_MAP: Record<string, LucideIcon> = {
  // ... existing mappings ...
  
  'agent-core': Brain,  // or Activity, Workflow, etc.
}
```

## Testing Integration

1. **Start Redflow development server**
   ```bash
   npm run dev
   ```

2. **Verify node appears in palette**
   - Open Node Palette
   - Look for "Agent Core" in appropriate category
   - Should have Brain icon

3. **Test node on canvas**
   - Drag Agent Core to canvas
   - Should render with custom styling
   - Click to open properties panel

4. **Test configuration editor**
   - All tabs should be accessible
   - Fields should validate correctly
   - Changes should persist

## Runtime Integration

For runtime status updates, the node should:

1. **Subscribe to observability WebSocket**
   - Connect to runtime observability stream
   - Listen for agent-core events

2. **Update node data in real-time**
   - Update `currentIteration`
   - Update `status`
   - Update `envelope` with latest data

3. **Trigger re-renders**
   - Use React Flow's `updateNodeData`
   - Display iteration progress
   - Show execution timeline

## Next Steps

- Implement actual REACT loop logic
- Add WebSocket integration for real-time updates
- Create unit tests for validation logic
- Add integration tests for full workflow
- Document example workflows

## Reference

- Base Node: `src/canvas/nodes/BaseNode.tsx`
- HTTP Request example: `src/components/nodes/http-request/`
- Tabbed Editor: `src/components/editors/TabbedNodeEditor.tsx`

