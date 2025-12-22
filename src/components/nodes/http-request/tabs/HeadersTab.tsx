/**
 * HeadersTab Component
 * 
 * Tab para configurar HTTP headers con:
 * - Editor de headers (form/JSON modes)
 * - Presets comunes
 */

import { useCallback } from 'react'
import { HeadersEditor } from '../../../editors/HeadersEditor'

export interface HeadersTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

export function HeadersTab({ nodeData, onNodeDataChange }: HeadersTabProps) {
  const headers = nodeData.headers || {}

  const handleHeadersChange = useCallback((newHeaders: Record<string, string>) => {
    onNodeDataChange({ ...nodeData, headers: newHeaders })
  }, [nodeData, onNodeDataChange])

  return (
    <div className="headers-tab space-y-4">
      <div className="text-sm text-zinc-400 mb-4">
        Configure HTTP headers for your request. Common headers like Content-Type and Authorization 
        are available as presets in Form mode.
      </div>

      <HeadersEditor
        headers={headers}
        onChange={handleHeadersChange}
      />

      {/* Info Box */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 text-sm">
        <p className="font-medium mb-2">Common Use Cases</p>
        <ul className="list-disc list-inside space-y-1 pl-2">
          <li>
            <strong>Authorization:</strong> Bearer tokens, API keys
            <div className="text-xs text-blue-200 mt-1 pl-5">
              Example: <code>Bearer {'{{msg.token}}'}</code>
            </div>
          </li>
          <li>
            <strong>Content-Type:</strong> Specify the format of your request body
            <div className="text-xs text-blue-200 mt-1 pl-5">
              Example: <code>application/json</code>, <code>application/x-www-form-urlencoded</code>
            </div>
          </li>
          <li>
            <strong>Accept:</strong> Specify the format you want in the response
            <div className="text-xs text-blue-200 mt-1 pl-5">
              Example: <code>application/json</code>
            </div>
          </li>
        </ul>
      </div>

      {/* Warning for dynamic headers */}
      {Object.values(headers).some((value: unknown) => typeof value === 'string' && value.includes('{{') && value.includes('}}')) && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-300 text-sm">
          <p className="font-medium mb-1">Dynamic Headers Detected</p>
          <p className="text-xs">
            Your headers contain mustache templates. Make sure the referenced properties exist 
            in the message at runtime.
          </p>
        </div>
      )}
    </div>
  )
}
