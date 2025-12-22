/**
 * TypeScript interfaces for HTTP Request node
 */

export interface HttpRequestConfig {
  // Request tab
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  timeout: number
  followRedirects: boolean

  // Headers tab
  headers: Record<string, string>

  // Body tab
  body: any
  bodyMode: 'form' | 'raw'
  bodyLanguage: 'json' | 'xml' | 'text'
  contentType: string

  // Advanced tab
  retryCount: number
  retryDelay: number
  useTls: boolean
  tlsConfig: string
  useProxy: boolean
  proxyConfig: string
  useAuth: boolean
  authType: 'basic' | 'bearer' | 'digest' | ''
}

export interface TabProps {
  nodeData: HttpRequestConfig
  onChange: (data: Partial<HttpRequestConfig>) => void
}

