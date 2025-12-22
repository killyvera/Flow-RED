/**
 * AdvancedTab Component
 * 
 * Tab para configuración avanzada de HTTP Request:
 * - Retry settings
 * - TLS/HTTPS configuration
 * - Proxy settings
 * - Other advanced options
 */

import { useCallback } from 'react'
import { NumberField, BooleanField, TextField } from '../../../fields'
import { AlertCircle } from 'lucide-react'

export interface AdvancedTabProps {
  nodeData: any
  onNodeDataChange: (data: any) => void
}

export function AdvancedTab({ nodeData, onNodeDataChange }: AdvancedTabProps) {
  const retryCount = nodeData.retryCount !== undefined ? nodeData.retryCount : 0
  const retryDelay = nodeData.retryDelay !== undefined ? nodeData.retryDelay : 1000
  const useTls = nodeData.useTls || false
  const tlsConfig = nodeData.tlsConfig || ''
  const useProxy = nodeData.useProxy || false
  const proxyConfig = nodeData.proxyConfig || ''

  // Handlers
  const handleRetryCountChange = useCallback((value: number) => {
    onNodeDataChange({ ...nodeData, retryCount: value })
  }, [nodeData, onNodeDataChange])

  const handleRetryDelayChange = useCallback((value: number) => {
    onNodeDataChange({ ...nodeData, retryDelay: value })
  }, [nodeData, onNodeDataChange])

  const handleUseTlsChange = useCallback((value: boolean) => {
    onNodeDataChange({ ...nodeData, useTls: value })
  }, [nodeData, onNodeDataChange])

  const handleTlsConfigChange = useCallback((value: string) => {
    onNodeDataChange({ ...nodeData, tlsConfig: value })
  }, [nodeData, onNodeDataChange])

  const handleUseProxyChange = useCallback((value: boolean) => {
    onNodeDataChange({ ...nodeData, useProxy: value })
  }, [nodeData, onNodeDataChange])

  const handleProxyConfigChange = useCallback((value: string) => {
    onNodeDataChange({ ...nodeData, proxyConfig: value })
  }, [nodeData, onNodeDataChange])

  return (
    <div className="advanced-tab space-y-6">
      <div 
        className="text-sm mb-4"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Advanced configuration options for HTTP requests.
      </div>

      {/* Retry Settings */}
      <div className="space-y-4">
        <h3 
          className="text-sm font-medium border-b pb-2"
          style={{
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-node-border)',
          }}
        >
          Retry Configuration
        </h3>
        
        <NumberField
          id="retryCount"
          label="Retry Count"
          value={retryCount}
          onChange={handleRetryCountChange}
          description="Number of times to retry on failure. 0 = no retries."
        />

        {retryCount > 0 && (
          <NumberField
            id="retryDelay"
            label="Retry Delay (ms)"
            value={retryDelay}
            onChange={handleRetryDelayChange}
            description="Delay between retry attempts in milliseconds."
          />
        )}

        {retryCount > 3 && (
          <div 
            className="flex items-start gap-2 p-3 rounded text-sm"
            style={{
              backgroundColor: 'var(--color-status-warning)',
              opacity: 0.1,
              border: '1px solid var(--color-status-warning)',
              borderOpacity: 0.3,
              color: 'var(--color-status-warning)',
            }}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>High retry count may cause significant delays if the endpoint is unavailable.</span>
          </div>
        )}
      </div>

      {/* TLS Settings */}
      <div className="space-y-4">
        <h3 
          className="text-sm font-medium border-b pb-2"
          style={{
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-node-border)',
          }}
        >
          TLS/HTTPS Configuration
        </h3>

        <BooleanField
          id="useTls"
          label="Use Custom TLS Configuration"
          value={useTls}
          onChange={handleUseTlsChange}
          description="Enable custom TLS/SSL certificate configuration"
        />

        {useTls && (
          <div className="space-y-2">
            <TextField
              id="tlsConfig"
              label="TLS Configuration"
              value={tlsConfig}
              onChange={handleTlsConfigChange}
              placeholder="tls-config-node-id"
              description="Node-RED TLS configuration node ID"
            />
            
            <div 
              className="p-3 rounded text-xs"
              style={{
                backgroundColor: 'var(--color-accent-primary)',
                opacity: 0.1,
                border: '1px solid var(--color-accent-primary)',
                borderOpacity: 0.3,
                color: 'var(--color-accent-primary)',
              }}
            >
              <p className="font-medium mb-1">TLS Configuration Node</p>
              <p>
                Create a TLS configuration node in Node-RED (Configuration nodes → tls-config) 
                and reference its ID here. This allows you to use custom certificates, CA certificates, 
                or disable certificate validation.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Proxy Settings */}
      <div className="space-y-4">
        <h3 
          className="text-sm font-medium border-b pb-2"
          style={{
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-node-border)',
          }}
        >
          Proxy Configuration
        </h3>

        <BooleanField
          id="useProxy"
          label="Use HTTP Proxy"
          value={useProxy}
          onChange={handleUseProxyChange}
          description="Route requests through an HTTP proxy"
        />

        {useProxy && (
          <div className="space-y-2">
            <TextField
              id="proxyConfig"
              label="Proxy URL"
              value={proxyConfig}
              onChange={handleProxyConfigChange}
              placeholder="http://proxy.example.com:8080"
              description="Full proxy URL including protocol and port"
            />
            
            <div 
              className="p-3 rounded text-xs"
              style={{
                backgroundColor: 'var(--color-accent-primary)',
                opacity: 0.1,
                border: '1px solid var(--color-accent-primary)',
                borderOpacity: 0.3,
                color: 'var(--color-accent-primary)',
              }}
            >
              <p className="font-medium mb-1">Proxy URL Format</p>
              <p>
                Use format: <code>http://proxy.example.com:8080</code><br />
                With authentication: <code>http://username:password@proxy.example.com:8080</code>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div 
        className="p-4 rounded text-sm"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-node-border)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <p 
          className="font-medium mb-2"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Additional Options
        </p>
        <p className="text-xs mb-3">
          More advanced options can be configured through Node-RED's settings.js or 
          via msg properties at runtime:
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs pl-2">
          <li><code>msg.rejectUnauthorized</code> - Validate SSL certificates</li>
          <li><code>msg.strictSSL</code> - Strict SSL validation</li>
          <li><code>msg.requestTimeout</code> - Override default timeout</li>
          <li><code>msg.encoding</code> - Response encoding</li>
        </ul>
      </div>
    </div>
  )
}
