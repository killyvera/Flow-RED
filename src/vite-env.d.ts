/// <reference types="vite/client" />

/**
 * Tipos para variables de entorno de Vite
 */
interface ImportMetaEnv {
  readonly VITE_NODE_RED_URL: string
  // Más variables de entorno se pueden añadir aquí
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

